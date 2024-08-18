from fastapi import *
from fastapi.staticfiles import StaticFiles
from api import main_router
from fastapi.responses import FileResponse

VIDEO_DIR = "/Users/tingweikao/Desktop/videos"


app=FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
# app.mount("/videos", StaticFiles(directory=VIDEO_DIR), name="videos")


# Static Pages (Never Modify Code in this Block)

@app.get("/", include_in_schema=False)
async def home(request: Request):
	return FileResponse("./templates/index.html", media_type="text/html")

@app.get("/route/{id}", include_in_schema=False)
async def route(request: Request):
	return FileResponse("./templates/route.html", media_type="text/html")


@app.get("/member/{id}", include_in_schema=False)
async def member(request: Request):
	return FileResponse("./templates/member.html", media_type="text/html")


@app.get("/register", include_in_schema=False)
async def video(request: Request):
	return FileResponse("./templates/register.html", media_type="text/html")

@app.get("/signin", include_in_schema=False)
async def video(request: Request):
	return FileResponse("./templates/signin.html", media_type="text/html")


# @app.get("/test", include_in_schema=False)
# async def video(request: Request):
# 	return FileResponse("./static/test.html", media_type="text/html")



##compontnet that shouldn't be a page itself
# @app.get("/voting", include_in_schema=False)
# async def voting(request: Request):
# 	return FileResponse("./static/voting.html", media_type="text/html")




app.include_router(main_router)

	
		

			
	