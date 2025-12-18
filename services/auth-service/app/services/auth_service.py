# Auth Service
# Business logic for authentication operations - only handles authentication and JWT management

from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import timedelta
from typing import Optional, Dict, Any
from app.models.user import User, UserRole
from app.core.security import verify_password, create_access_token
from app.core.config import settings

def authenticate_user(db: Session, username: str, password: str) -> Optional[Dict[str, Any]]:
    # Authenticate user and return user data if valid
    # First check if admin credentials
    if username == settings.ADMIN_USERNAME and password == settings.ADMIN_PASSWORD_HASH:
        return {
            "id": None,  # Backward compatibility
            "user_id": None,  # Admin doesn't have user_id
            "username": settings.ADMIN_USERNAME,
            "email": None,
            "name": "Admin",
            "user_role": UserRole.ADMIN,
            "is_active": True,
            "is_admin": True
        }
    
    # Validate credentials via User Service (query user table)
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    
    return {
        "user_id": user.user_id,  # Business identifier
        "username": user.username,
        "email": user.email,
        "name": user.name,
        "user_role": user.user_role,
        "is_active": user.is_active,
        "is_admin": False
    }

def create_access_token_for_user(user_data: Dict[str, Any]) -> str:
    # Create access token for user with required JWT claims: sub, role, is_active, iss, iat, exp
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Get role value
    role_value = user_data["user_role"].value if hasattr(user_data["user_role"], "value") else str(user_data["user_role"])
    
    # Build JWT claims
    token_data = {
        "role": role_value,
        "is_active": user_data["is_active"]
    }
    
    # For admin, sub is None; for regular users, sub is user_id business identifier (string)
    if not user_data.get("is_admin") and user_data.get("user_id"):
        token_data["sub"] = user_data["user_id"]  # Already a string business identifier
    
    return create_access_token(
        data=token_data,
        expires_delta=access_token_expires
    )

