"""
Auth Service - Main FastAPI Application Entry Point
Handles user authentication, registration, and token management
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1 import router

# ============================================================================
# Database Initialization
# ============================================================================
# Create all database tables based on SQLAlchemy models
Base.metadata.create_all(bind=engine)

# ============================================================================
# FastAPI Application Setup
# ============================================================================
app = FastAPI(
    title="Auth Service API",
    description="Authentication and Authorization Service for IMS",
    version="1.0.0"
)

# ============================================================================
# CORS Middleware Configuration
# ============================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# API Routes Registration
# ============================================================================
app.include_router(router, prefix=settings.API_V1_PREFIX)

# ============================================================================
# Root Endpoints
# ============================================================================
@app.get("/")
async def root():
    """Root endpoint - returns service status"""
    return {"service": "auth-service", "status": "running"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "auth-service"}

