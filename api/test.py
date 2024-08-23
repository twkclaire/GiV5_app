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

class ProcessVideoRequest(BaseModel):
    route_id: int
    file_key: str


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
            ExpiresIn=3600  # URL expiration time in seconds
        )
        return {"presigned_url": presigned_url, "file_key": unique_file_name}
    except Exception as e:
        print(f"Error generating presigned URL: {e}")
        raise HTTPException(status_code=500, detail="Error generating presigned URL")
    

# Step 2: Upon finishing upload, frontend send a trigger to innitate background process
@router.post("/api/route/process-video", tags=["video"])
async def process_video_in_background(request: ProcessVideoRequest, background_tasks: BackgroundTasks):
    route_id = request.route_id
    file_key = request.file_key
    print(f"Received route_id: {route_id}, file_key: {file_key}")
    background_tasks.add_task(process_video, route_id, file_key)
    return {"message": "Video processing started in the background"}


def process_video(route_id: int, file_key: str):
    start_time = time.time()
    
    try:
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
        insert_video_metadata(route_id, mpd_url)

        end_time = time.time()
        duration = end_time - start_time

        print(f"Video processing completed in {duration} seconds")

    except Exception as e:
        print(f"An error occurred during video processing: {e}")

    finally:
        # Clean up temporary files
        if os.path.exists(local_file_path):
            os.remove(local_file_path)
        if os.path.exists(hls_dirpath):
            subprocess.run(["rm", "-rf", hls_dirpath])





def insert_video_metadata(route_id, mpd_url, member_id=None):
    try:
        db =cnxpool.get_connection()
        mycursor = db.cursor()
        sql = """
        INSERT INTO video (route_id, mpd_url, upload_date, member_id)
        VALUES (%s, %s,  NOW(), %s)
        """    
        mycursor.execute(sql, (route_id, mpd_url, member_id))
        db.commit()
    
    except Error as e:
        print(f"Error: {e}")
    
    finally:
        if db.is_connected():
            mycursor.close()
            db.close()


