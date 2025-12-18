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
    db: Session = Depends(get_db),
    allow_inactive: bool = False
) -> Union[User, dict]:
    # FastAPI dependency to get the currently authenticated user
    # Returns User object for regular users, dict for admin
    token = credentials.credentials
    payload = decode_access_token(token)
    if payload is None:
        print(f"[User Service] Token decode failed for token (first 30 chars): {token[:30] if token else 'None'}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if admin (sub is None and role is ADMIN)
    role = payload.get("role")
    user_id = payload.get("sub")  # Business identifier string (e.g., "USR-000001")
    
    print(f"[User Service] Decoded token - role: {role}, user_id: {user_id}, is_active: {payload.get('is_active')}")
    
    if role == UserRole.ADMIN.value and user_id is None:
        print(f"[User Service] Admin user detected")
        # Return admin user dict
        return {
            "id": None,
            "user_id": None,
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
    
    # Check activation status unless explicitly allowed
    if not allow_inactive and not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    return user

def require_role(*allowed_roles):
    # Dependency factory for role-based access control
    def role_checker(current_user = Depends(get_current_user)):
        user_role = None
        if isinstance(current_user, dict):
            user_role = current_user.get("user_role")
        else:
            user_role = current_user.user_role
        
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user
    return role_checker

def require_active_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Union[User, dict]:
    # Dependency that enforces active user status
    return get_current_user(credentials, db, allow_inactive=False)

