# FastAPI Dependencies for Authentication

from fastapi import Depends, HTTPException, status, Request
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

# Make HTTPBearer auto_error=False so we can handle errors ourselves
security = HTTPBearer(auto_error=False)

def get_current_user_id(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    allow_inactive: bool = False
) -> str:
    # Extract user ID (business identifier) from JWT token and check activation status
    try:
        # Check if credentials were provided
        if credentials is None:
            # Try to get token from Authorization header manually
            auth_header = request.headers.get("Authorization")
            print(f"[Patient Service] No credentials from HTTPBearer. Authorization header: {auth_header[:50] if auth_header else 'None'}...")
            if not auth_header or not auth_header.startswith("Bearer "):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not validate credentials",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            token = auth_header.replace("Bearer ", "").strip()
        else:
            token = credentials.credentials
        
        print(f"[Patient Service] Received token (first 30 chars): {token[:30] if token else 'None'}...")
        payload = decode_access_token(token)
        if payload is None:
            print("[Patient Service] Token decode returned None")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        print(f"[Patient Service] Token decoded successfully. Payload: {list(payload.keys())}")
        user_id = payload.get("sub")  # Business identifier string (e.g., "USR-000001")
        if user_id is None:
            print(f"[Patient Service] Token payload missing 'sub' claim. Payload keys: {list(payload.keys())}")
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
        print(f"[Patient Service] Extracted user_id: {user_id}")
        return user_id
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Patient Service] Unexpected error in get_current_user_id: {str(e)}, type: {type(e).__name__}")
        import traceback
        print(f"[Patient Service] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    allow_inactive: bool = False
) -> Union[dict, int]:
    # FastAPI dependency to get the currently authenticated user
    # Returns user dict for admin, user_id for regular users
    try:
        if credentials is None:
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not validate credentials",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            token = auth_header.replace("Bearer ", "").strip()
        else:
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
        
        # Note: Activation check would require querying user table
        # For now, return user_id and let endpoints handle activation checks
        return user_id  # Business identifier string
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

def require_role(*allowed_roles):
    # Dependency factory for role-based access control
    def role_checker(
        request: Request,
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: Session = Depends(get_db)
    ):
        # Handle case where credentials might be None
        if credentials is None:
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not validate credentials",
                )
            token = auth_header.replace("Bearer ", "").strip()
        else:
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

