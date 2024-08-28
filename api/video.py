from fastapi import *
from pydantic import BaseModel
import boto3
import os
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


VIDEO_SERVICE_URL = "http://3.67.76.85:8000"  # Your video app URL

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