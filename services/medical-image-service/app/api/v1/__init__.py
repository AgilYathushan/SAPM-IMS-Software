from fastapi import APIRouter
from app.api.v1 import medical_images

router = APIRouter()
router.include_router(medical_images.router, prefix="/medical-images", tags=["medical-images"])

