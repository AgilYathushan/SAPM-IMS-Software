"""
API Gateway Service - FastAPI Gateway
Routes all API requests to appropriate backend services
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
import httpx
from typing import Optional
import os

# ============================================================================
# Service Configuration
# ============================================================================
SERVICE_MAPPINGS = {
    "/api/v1/auth": "http://auth-service:5001",
    "/api/v1/users": "http://user-service:5002",
    "/api/v1/patients": "http://patient-service:5003",
    "/api/v1/medical-staff": "http://medical-staff-service:5004",
    "/api/v1/medical-images": "http://medical-image-service:5005",
    "/api/v1/medical-tests": "http://medical-test-service:5009",
    "/api/v1/diagnostic-reports": "http://diagnostic-report-service:5006",
    "/api/v1/billing": "http://billing-service:5007",
    "/api/v1/workflow": "http://workflow-service:5008",
}

# CORS Configuration
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

# ============================================================================
# FastAPI Application Setup
# ============================================================================
app = FastAPI(
    title="IMS API Gateway",
    description="API Gateway for Image Management System",
    version="1.0.0"
)

# ============================================================================
# CORS Middleware Configuration
# ============================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Auth-Token"],
    max_age=3600,
)

# ============================================================================
# Helper Functions
# ============================================================================
def find_target_service(path: str) -> Optional[tuple[str, str]]:
    """
    Find the target service URL for a given path.
    Returns (base_url, full_path) or None if no match.
    Services expect the full path including /api/v1 prefix.
    """
    # Normalize path - ensure it starts with /
    if not path.startswith("/"):
        path = "/" + path
    
    # Sort by path length (longest first) to match more specific paths first
    sorted_paths = sorted(SERVICE_MAPPINGS.keys(), key=len, reverse=True)
    
    for service_path in sorted_paths:
        if path.startswith(service_path):
            base_url = SERVICE_MAPPINGS[service_path]
            # Forward the full path to the service (services expect /api/v1 prefix)
            return (base_url, path)
    
    return None

async def proxy_request(request: Request, target_url: str, path: str):
    """
    Proxy a request to the target service.
    """
    # Build full URL
    full_url = f"{target_url}{path}"
    
    # Get query parameters
    query_params = dict(request.query_params)
    
    # Get request body
    body = await request.body()
    
    # Get headers (exclude host and connection)
    headers = dict(request.headers)
    headers.pop("host", None)
    headers.pop("connection", None)
    headers.pop("content-length", None)
    
    # Make request to backend service
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.request(
                method=request.method,
                url=full_url,
                params=query_params,
                content=body,
                headers=headers,
                follow_redirects=True,
            )
            
            # Get response body
            response_body = response.content
            
            # Create response with same status code and headers
            response_headers = dict(response.headers)
            # Remove headers that shouldn't be forwarded
            response_headers.pop("content-encoding", None)
            response_headers.pop("transfer-encoding", None)
            response_headers.pop("content-length", None)
            
            return Response(
                content=response_body,
                status_code=response.status_code,
                headers=response_headers,
                media_type=response.headers.get("content-type"),
            )
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Gateway timeout")
        except httpx.ConnectError:
            raise HTTPException(status_code=503, detail="Service unavailable")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gateway error: {str(e)}")

# ============================================================================
# Catch-all Route Handler
# ============================================================================
@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def gateway_router(request: Request, path: str):
    """
    Route all requests to appropriate backend services.
    """
    # Handle root and health check
    if path == "" or path == "/":
        return {"service": "api-gateway", "status": "running", "version": "1.0.0"}
    
    if path == "health":
        return {"status": "healthy", "service": "api-gateway"}
    
    # Normalize path
    full_path = f"/{path}" if not path.startswith("/") else path
    
    # Find target service
    service_info = find_target_service(full_path)
    
    if not service_info:
        raise HTTPException(status_code=404, detail=f"Route not found: {full_path}")
    
    target_url, remaining_path = service_info
    
    # Proxy the request
    return await proxy_request(request, target_url, remaining_path)

# ============================================================================
# Root Endpoints
# ============================================================================
@app.get("/")
async def root():
    """Root endpoint - returns gateway status"""
    return {
        "service": "api-gateway",
        "status": "running",
        "version": "1.0.0",
        "routes": list(SERVICE_MAPPINGS.keys())
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "api-gateway"}

