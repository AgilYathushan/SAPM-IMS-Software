# Standardized Error Handling for All Services
# Provides consistent error response format across all microservices
# Note: This is a shared utility that can be used by any service if needed

from fastapi import HTTPException, status
from typing import Optional
import uuid
from datetime import datetime

class APIError(Exception):
    """Base exception class for API errors"""
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[dict] = None
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        self.request_id = str(uuid.uuid4())
        self.timestamp = datetime.utcnow().isoformat()

def create_error_response(
    code: str,
    message: str,
    status_code: int = status.HTTP_400_BAD_REQUEST,
    details: Optional[dict] = None
) -> dict:
    """
    Create a standardized error response
    
    Args:
        code: Error code (e.g., "USER_NOT_FOUND")
        message: Human-readable error message
        status_code: HTTP status code
        details: Additional error details
    
    Returns:
        Standardized error response dictionary
    """
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
            "timestamp": datetime.utcnow().isoformat()
        }
    }

def raise_http_exception(
    code: str,
    message: str,
    status_code: int = status.HTTP_400_BAD_REQUEST,
    details: Optional[dict] = None
):
    """
    Raise an HTTPException with standardized error format
    
    Args:
        code: Error code
        message: Error message
        status_code: HTTP status code
        details: Additional details
    """
    error_response = create_error_response(code, message, status_code, details)
    raise HTTPException(
        status_code=status_code,
        detail=error_response
    )

# Common error codes
class ErrorCodes:
    # Authentication errors
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    TOKEN_INVALID = "TOKEN_INVALID"
    UNAUTHORIZED = "UNAUTHORIZED"
    
    # User errors
    USER_NOT_FOUND = "USER_NOT_FOUND"
    USER_ALREADY_EXISTS = "USER_ALREADY_EXISTS"
    INVALID_USER_DATA = "INVALID_USER_DATA"
    
    # Patient errors
    PATIENT_NOT_FOUND = "PATIENT_NOT_FOUND"
    PATIENT_ALREADY_EXISTS = "PATIENT_ALREADY_EXISTS"
    
    # Permission errors
    FORBIDDEN = "FORBIDDEN"
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
    
    # Validation errors
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_INPUT = "INVALID_INPUT"
    
    # Server errors
    INTERNAL_ERROR = "INTERNAL_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"

