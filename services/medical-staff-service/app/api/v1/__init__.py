from fastapi import APIRouter
from app.api.v1 import medical_staff

router = APIRouter()
router.include_router(medical_staff.router, prefix="/medical-staff", tags=["medical-staff"])

