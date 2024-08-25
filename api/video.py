from fastapi import *
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse, FileResponse
from database import cnxpool
from pydantic import BaseModel
import boto3
from botocore.exceptions import NoCredentialsError
import os
from uuid import uuid4
import subprocess
from mysql.connector.pooling import MySQLConnectionPool
from mysql.connector import Error
import os
import time
from dotenv import load_dotenv
import httpx
import logging

logging.basicConfig(level=logging.DEBUG)


load_dotenv()
router=APIRouter()

BUCKET_NAME='claire-project-for-wehelp'
s3_client = boto3.client('s3', 
                  aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                  aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
                  region_name=os.getenv('AWS_DEFAULT_REGION'))
CLOUDFRONT_DOMAIN = 'd2jdt95w56fzkq.cloudfront.net'


VIDEO_SERVICE_URL = "http://18.193.82.8:8000"  # Your video app URL

class PresignedUrlRequest(BaseModel):
    file_name: str
    content_type: str
    route_id: int
    file_size: int
    member_id: int

class ProcessVideoRequest(BaseModel):
    route_id: int
    file_key: str
    video_id: int

@router.post("/api/route/presigned-url")
async def forward_presigned_url(request: PresignedUrlRequest):
    data = {
        "file_name": request.file_name,
        "content_type": request.content_type,
        "route_id": request.route_id,
        "file_size": request.file_size,
        "member_id": request.member_id
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{VIDEO_SERVICE_URL}/api/route/presigned-url", json=data)
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail", "Error"))

@router.post("/api/route/process-video")
async def forward_process_video(request: ProcessVideoRequest):
    data = {
        "route_id": request.route_id,
        "file_key": request.file_key,
        "video_id": request.video_id
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{VIDEO_SERVICE_URL}/api/route/process-video", json=data)
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail", "Error"))

@router.get("/api/route/video-status/{video_id}")
async def forward_video_status(video_id: int):
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{VIDEO_SERVICE_URL}/api/route/video-status/{video_id}")
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail", "Error"))

# def insert_video_metadata(route_id, mpd_url, member_id=None):
#     try:
#         db =cnxpool.get_connection()
#         mycursor = db.cursor()
#         sql = """
#         INSERT INTO video (route_id, mpd_url, upload_date, member_id)
#         VALUES (%s, %s,  NOW(), %s)
#         """    
#         mycursor.execute(sql, (route_id, mpd_url, member_id))
#         db.commit()
    
#     except Error as e:
#         print(f"Error: {e}")
    
#     finally:
#         if db.is_connected():
#             mycursor.close()
#             db.close()

# @router.post("/api/upload")
# async def upload_video(video: UploadFile = File(...)):
#     start_time = time.time()
#     try:
#         filename = f"{uuid4()}-{video.filename}"
#         file_path = f"videos/{filename}"

#         # Upload the video file directly to S3
#         s3_client.upload_fileobj(
#             video.file,
#             BUCKET_NAME,
#             file_path,
#             ExtraArgs={
#                 "ContentType": video.content_type
#             }
#         )

#         # Construct the CloudFront URL for the video
#         video_url = f"https://{CLOUDFRONT_DOMAIN}/{file_path}"

#         end_time = time.time()  # Record end time
#         duration = end_time - start_time  # Calculate duration

#         return {"url": video_url,"duration_seconds": duration}

#     except Exception as e:
#         print(f"An error occurred: {e}")
#         raise HTTPException(status_code=500, detail="Failed to upload the video")

# class FileUploadRequest(BaseModel):
#     filename: str
#     content_type: str

# @router.post("/api/get_presigned_url")
# async def get_presigned_url(request: FileUploadRequest):
#     print(request)
#     try:
#         file_key = f"uploads/{uuid4()}-{request.filename}"
        
#         # Generate a presigned URL for uploading the file to S3
#         presigned_url = s3_client.generate_presigned_url(
#             'put_object',
#             Params={'Bucket': BUCKET_NAME, 'Key': file_key, 'ContentType': request.content_type},
#             ExpiresIn=3600  
#         )
        
#         # Return the presigned URL and file key
#         return {"url": presigned_url, "file_key": file_key}
    
#     except Exception as e:
#         # Print the exception for debugging
#         print(f"Error generating presigned URL: {e}")
#         raise HTTPException(status_code=500, detail="Internal Server Error")
    




# async def fetch_mrts():
#     url = "http://35.159.38.195:8000/"
#     async with httpx.AsyncClient() as client:
#         response = await client.get(url)
#         response.raise_for_status()
#         try:
#             return response.json()
#         except ValueError:
#             return {"error": True, "message": "Failed to decode JSON"}

# @router.get("/api/test_subprocess_EC2", tags=["test"])
# async def test_subprocess_ec2():
#     try:
#         response = await fetch_mrts()
#         return response
#     except httpx.RequestError as e:
#         return {"error": True, "message": f"Request error: {str(e)}"}
#     except httpx.HTTPStatusError as e:
#         return {"error": True, "message": f"HTTP status error: {str(e)}"}

# Define the EC2 endpoint URL
# EC2_ENDPOINT_URL = "http://35.159.38.195:8000/api/route"  # Replace with the actual public endpoint

# async def forward_video_to_ec2(route_id: int, video: UploadFile):
#     async with httpx.AsyncClient() as client:
#         files = {
#             "route_id": (None, str(route_id)),
#             "video": (video.filename, video.file, video.content_type)
#         }
#         response = await client.post(EC2_ENDPOINT_URL, files=files)
#         response.raise_for_status()
#         return response.json()

# timeout = httpx.Timeout(
#     connect=30.0,  # 30 seconds to establish connection
#     read=120.0,    # 120 seconds to receive response
#     write=120.0,   # 120 seconds for sending data
#     pool=None      # No explicit pool timeout
# )

# async def forward_video_to_ec2(route_id: int, video: UploadFile):
#     async with httpx.AsyncClient(timeout=timeout) as client:
#         # Prepare the files to be sent
#         files = {
#             "video": (video.filename, video.file, video.content_type)
#         }
#         data = {
#             "route_id": str(route_id)
#         }
#         try:
#             response = await client.post(EC2_ENDPOINT_URL, files=files, data=data)
#             response.raise_for_status()
#             return response.json()
#         except httpx.RequestError as e:
#             # Log the exception details
#             print(f"Request error: {e}")
#             raise e
#         except httpx.HTTPStatusError as e:
#             # Log the HTTP status error details
#             print(f"HTTP status error: {e}")
#             raise e

# @router.post("/api/route", tags=["media"])
# async def upload_and_forward_video(route_id: int = Form(...), video: UploadFile = File(...)):
#     logging.debug(f"Received route_id: {route_id}")
#     logging.debug(f"Received video filename: {video.filename}")

#     try:
#         response = await forward_video_to_ec2(route_id, video)
#         return JSONResponse(content=response)
#     except httpx.RequestError as e:
#         logging.error(f"Request error: {e}")
#         return JSONResponse(status_code=500, content={"error": True, "message": f"Request error: {str(e)}"})
#     except httpx.HTTPStatusError as e:
#         logging.error(f"HTTP status error: {e}")
#         return JSONResponse(status_code=500, content={"error": True, "message": f"HTTP status error: {str(e)}"})

# # @router.post("/api/route", tags=["media"])
# # async def upload_and_forward_video(route_id: int = Form(...), video: UploadFile = File(...)):
# #     print(route_id,video)
# #     try:
# #         response = await forward_video_to_ec2(route_id, video)
# #         return JSONResponse(content=response)
# #     except httpx.RequestError as e:
# #         return JSONResponse(status_code=500, content={"error": True, "message": f"Request error: {str(e)}"})
# #     except httpx.HTTPStatusError as e:
# #         return JSONResponse(status_code=500, content={"error": True, "message": f"HTTP status error: {str(e)}"})