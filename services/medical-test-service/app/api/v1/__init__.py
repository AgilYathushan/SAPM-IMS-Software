from fastapi import APIRouter
from app.api.v1.medical_tests import router

api_router = APIRouter()
api_router.include_router(router, prefix="/medical-tests", tags=["medical-tests"])

