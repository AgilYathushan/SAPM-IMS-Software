"""
User Service - Main FastAPI Application Entry Point
Handles user management operations
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1 import router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="User Service API",
    description="User Management Service for IMS",
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
    return {"service": "user-service", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "user-service"}

