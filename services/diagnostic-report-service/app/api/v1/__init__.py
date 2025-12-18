from fastapi import APIRouter
from app.api.v1 import diagnostic_reports

router = APIRouter()
router.include_router(diagnostic_reports.router, prefix="/diagnostic-reports", tags=["diagnostic-reports"])

