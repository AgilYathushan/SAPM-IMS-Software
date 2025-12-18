"""
Patient Service API Router
"""

from fastapi import APIRouter
from app.api.v1 import patients

router = APIRouter()
router.include_router(patients.router, prefix="/patients", tags=["patients"])

