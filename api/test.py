from fastapi import *
import boto3
import os
from uuid import uuid4
import subprocess
from mysql.connector import Error
from dotenv import load_dotenv
import time
from database import cnxpool
from pydantic import BaseModel


load_dotenv() 
router=APIRouter()


BUCKET_NAME='claire-project-for-wehelp'
s3_client = boto3.client('s3', 
                  aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                  aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
                  region_name=os.getenv('AWS_DEFAULT_REGION'))
CLOUDFRONT_DOMAIN = 'd2jdt95w56fzkq.cloudfront.net'


@router.get("/hello",tags=["Test"])
def read_root():
    return {"Hello": "World"}


class PresignedUrlRequest(BaseModel):
    file_name: str
    content_type: str
    route_id:int

class ProcessVideoRequest(BaseModel):
    route_id: int
    file_key: str
    video_id: int


# Step1: create a presigned url and send it back to frontend 
@router.post("/api/route/presigned-url", tags=["video"])
async def create_presigned_url(request: PresignedUrlRequest):
    file_name = request.file_name
    content_type = request.content_type
    print(f"file_name: {file_name}, content_type: {content_type}")
    try:
        unique_file_name = f"{uuid4()}-{file_name}"
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': unique_file_name,
                'ContentType': content_type
            },
            ExpiresIn=3600  #  expiration time 60 mins
        )

        video_id = insert_initial_video_metadata(request.route_id, presigned_url)
        if not video_id:
            raise HTTPException(status_code=500, detail="Error inserting video metadata")
        
        return {"presigned_url": presigned_url, "file_key": unique_file_name, "video_id": video_id}
    except Exception as e:
        print(f"Error generating presigned URL: {e}")
        raise HTTPException(status_code=500, detail="Error generating presigned URL")
    

# Step 2: Upon finishing upload, frontend send a trigger to innitate background process
@router.post("/api/route/process-video", tags=["video"])
async def process_video_in_background(request: ProcessVideoRequest, background_tasks: BackgroundTasks):
    route_id = request.route_id
    file_key = request.file_key
    video_id= request.video_id
    print(f"Received route_id: {route_id}, file_key: {file_key}, video_id:{video_id}")
    background_tasks.add_task(process_video, route_id, file_key, video_id)
    return {"message": "Video processing started in the background"}




#Step3:polling to check transcode status
@router.get("/api/route/video-status/{video_id}", tags=["video"])
async def get_video_status(video_id: int):
    if not video_id:
        raise HTTPException(status_code=400, detail="No uploaded video found")
    try:
        db = cnxpool.get_connection()
        cursor = db.cursor()
        cursor.execute("SELECT status, mpd_url FROM video WHERE video_id = %s", (video_id,))
        result = cursor.fetchone()
        if result:
            status, mpd_url = result #tupil unpack
            return {"status": status, "mpd_url": mpd_url}
        else:
            raise HTTPException(status_code=404, detail="Video not found")
    except Error as e:
        print(f"Error retrieving video status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        if db.is_connected():
            cursor.close()
            db.close()

def insert_initial_video_metadata(route_id, presigned_url):
    try:
        db = cnxpool.get_connection()
        mycursor = db.cursor()
        sql = """
        INSERT INTO video (route_id, mpd_url, upload_date, status, presigned_url)
        VALUES (%s, 'waiting', NOW(), 'pending', %s)
        """
        mycursor.execute(sql, (route_id, presigned_url))
        db.commit()
        return mycursor.lastrowid  # Return the ID of the newly inserted record
    except Error as e:
        print(f"Error inserting initial video metadata: {e}")
        return None
    finally:
        if db.is_connected():
            mycursor.close()
            db.close()    



def process_video(route_id: int, file_key: str, video_id:int):
    start_time = time.time()
    
    try:

        # Step 0: Set status to 'processing' before starting download
        update_video_status('processing',video_id)

        # Step 1: Download the file from S3
        local_file_path = os.path.join("/tmp", file_key)
        s3_client.download_file(BUCKET_NAME, file_key, local_file_path)
        
        # Step 2: Process the video using ffmpeg 
        hls_filename = f"{uuid4()}"
        hls_dirpath = os.path.join("/tmp", hls_filename)
        hls_filepath = os.path.join(hls_dirpath, f"{hls_filename}.mpd")
        
        if not os.path.exists(hls_dirpath):
            os.makedirs(hls_dirpath)

        ffmpeg_command = [
            "ffmpeg", "-i", local_file_path,
            "-map", "0:v", "-map", "0:v", "-map", "0:v", "-map", "0:v",  
            "-map", "0:a",  
            "-b:v:0", "300k",  
            "-b:v:1", "600k",   
            "-b:v:2", "1200k",  
            "-b:v:3", "2400k",  
            "-c:v", "libx264", "-preset", "veryfast",  
            "-c:a", "copy", 
            "-f", "dash",  
            hls_filepath 
        ]

        subprocess.run(ffmpeg_command, check=True)

        # Step 3: Upload processed video and manifest files to S3
        for root, dirs, files in os.walk(hls_dirpath):
            for filename in files:
                local_file_path = os.path.join(root, filename)
                s3_key = f"{hls_filename}/{filename}"
                s3_client.upload_file(local_file_path, BUCKET_NAME, s3_key)

        # Step 4: Store metadata in the database
        mpd_url = f"https://{CLOUDFRONT_DOMAIN}/{hls_filename}/{hls_filename}.mpd"
        update_video_metadata(video_id, mpd_url)

        end_time = time.time()
        duration = end_time - start_time

        print(f"Video processing completed in {duration} seconds")

    except Exception as e:
        print(f"An error occurred during video processing: {e}")
        update_video_status('failed', video_id)

    finally:
        # Clean up temporary files
        if os.path.exists(local_file_path):
            os.remove(local_file_path)
        if os.path.exists(hls_dirpath):
            subprocess.run(["rm", "-rf", hls_dirpath])




def update_video_status(status, video_id):
    try:
        db =cnxpool.get_connection()
        mycursor = db.cursor()
        sql = """
        UPDATE video 
        SET status = %s 
        WHERE video_id = %s 
        """    
        mycursor.execute(sql, (status, video_id))
        db.commit()
    
    except Error as e:
        print(f"Error updating video status: {e}")
    
    finally:
        if db.is_connected():
            mycursor.close()
            db.close()

def update_video_metadata(video_id, mpd_url):
    try:
        db =cnxpool.get_connection()
        mycursor = db.cursor()
        sql = """
        UPDATE video 
        SET mpd_url = %s, status = %s 
        WHERE video_id = %s 
        """    
        mycursor.execute(sql, (mpd_url,"completed", video_id))
        db.commit()
    
    except Error as e:
        print(f"Error updating video metadata: {e}")
    
    finally:
        if db.is_connected():
            mycursor.close()
            db.close()




