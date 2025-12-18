from fastapi import FastAPI  # FastAPI framework for building REST APIs
from fastapi.middleware.cors import CORSMiddleware  # CORS middleware for cross-origin requests
from app.core.config import settings  # Application configuration settings
from app.core.database import engine  # Database engine connection
from app.api.v1 import router  # API v1 router with all endpoints
from app.models import DiagnosticReport  # Diagnostic report database model

try:
    DiagnosticReport.__table__.create(bind=engine, checkfirst=True)
except Exception as e:
    print(f"Warning creating DiagnosticReport table: {e}")

app = FastAPI(
    title="Diagnostic Report Service API",
    description="Diagnostic Report Service for IMS",
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

@app.get("/")  # Root endpoint to check service status
async def root():
    return {"service": "diagnostic-report-service", "status": "running"}

@app.get("/health")  # Health check endpoint for service monitoring
async def health_check():
    return {"status": "healthy", "service": "diagnostic-report-service"}

