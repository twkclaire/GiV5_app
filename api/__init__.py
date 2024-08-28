from fastapi import APIRouter

main_router =APIRouter()


from .routes import router as routes_router
from .record import router as record_router
from .member import router as member_router
from .video import router as video_router
# from .test import router as test_router


main_router.include_router(routes_router)
main_router.include_router(record_router)
main_router.include_router(member_router)
main_router.include_router(video_router)
# main_router.include_router(test_router)