# FastAPI Dependencies for Authentication

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Union
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User, UserRole

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Union[User, dict]:
    # FastAPI dependency to get the currently authenticated user
    # Returns User object for regular users, dict for admin
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
    
    # Regular user - fetch from database using business identifier
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    
    user = db.query(User).filter(User.user_id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user

