from fastapi import APIRouter
from app.api.v1 import workflow

router = APIRouter()
router.include_router(workflow.router, prefix="/workflow", tags=["workflow"])

