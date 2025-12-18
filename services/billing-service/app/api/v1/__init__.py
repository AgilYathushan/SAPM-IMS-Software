from fastapi import APIRouter
from app.api.v1 import billing

router = APIRouter()
router.include_router(billing.router, prefix="/billing", tags=["billing"])

