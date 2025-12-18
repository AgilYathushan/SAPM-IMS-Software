# Billing Service - Main FastAPI Application Entry Point
# Handles billing and payment management

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import NoReferencedTableError
from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1 import router
# Import models to register them with Base.metadata
from app.models import Bill, Payment

# Database Initialization with error handling for cross-schema foreign keys
# Import models first to ensure they're registered with Base.metadata
from app.models import Bill, Payment

# Create tables individually to handle foreign key issues gracefully
try:
    # Create Bill table first
    Bill.__table__.create(bind=engine, checkfirst=True)
except Exception as e:
    print(f"Warning creating Bill table: {e}")

try:
    # Create Payment table (has foreign key to Bill)
    Payment.__table__.create(bind=engine, checkfirst=True)
except Exception as e:
    print(f"Warning creating Payment table: {e}")

app = FastAPI(
    title="Billing Service API",
    description="Billing and Payment Service for IMS",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix=settings.API_V1_PREFIX)

@app.get("/")
async def root():
    return {"service": "billing-service", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "billing-service"}

