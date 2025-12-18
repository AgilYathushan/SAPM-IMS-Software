# Medical Test Service - Main FastAPI Application Entry Point
# Handles medical test request management

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import NoReferencedTableError
from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1 import api_router
# Import models to register them with Base.metadata
from app.models import MedicalTest

# Create tables individually to handle foreign key issues gracefully
try:
    # Create MedicalTest table (it has foreign keys to other schemas)
    MedicalTest.__table__.create(bind=engine, checkfirst=True)
except Exception as e:
    print(f"Warning creating MedicalTest table: {e}")

app = FastAPI(
    title="Medical Test Service API",
    description="Medical Test Request Management Service for IMS",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)

@app.get("/")
async def root():
    return {"service": "medical-test-service", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "medical-test-service"}

