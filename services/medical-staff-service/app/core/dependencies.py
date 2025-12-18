# FastAPI Dependencies for Authentication

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Union
from app.core.database import get_db
from app.core.security import decode_access_token
import enum

# User Role Enumeration
class UserRole(str, enum.Enum):
    ADMIN = "admin"
    PATIENT = "patient"
    RADIOLOGIST = "radiologist"
    DOCTOR = "doctor"
    CASHIER = "cashier"

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    allow_inactive: bool = False
) -> Union[dict, str]:
    # FastAPI dependency to get the currently authenticated user
    # Returns user dict for admin, user_id (business identifier) for regular users
    token = credentials.credentials
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if admin (sub is None and role is ADMIN)
    role = payload.get("role")
    user_id = payload.get("sub")  # Business identifier string
    
    if role == UserRole.ADMIN.value and user_id is None:
        # Return admin user dict
        return {
            "id": None,
            "username": "admin",
            "email": None,
            "name": "Admin",
            "user_role": UserRole.ADMIN,
            "is_active": True,
            "is_admin": True
        }
    
    # Regular user - return user_id (business identifier)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    
    # Check if user is active (unless explicitly allowed for profile access)
    if not allow_inactive:
        is_active = payload.get("is_active", True)
        if not is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive. Please contact administrator."
            )
    
    return user_id

def require_role(*allowed_roles):
    # Dependency factory for role-based access control
    def role_checker(
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: Session = Depends(get_db)
    ):
        token = credentials.credentials
        payload = decode_access_token(token)
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )
        # Check if user is active
        is_active = payload.get("is_active", True)
        if not is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive. Please contact administrator."
            )
        user_role = payload.get("role")
        allowed_role_values = [role.value if hasattr(role, 'value') else str(role) for role in allowed_roles]
        if user_role not in allowed_role_values:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        # Return user dict for admin, user_id (business identifier) for regular users
        user_id = payload.get("sub")  # Business identifier string
        if user_role == UserRole.ADMIN.value and user_id is None:
            return {
                "id": None,
                "username": "admin",
                "email": None,
                "name": "Admin",
                "user_role": UserRole.ADMIN,
                "is_active": True,
                "is_admin": True
            }
        return user_id
    return role_checker

