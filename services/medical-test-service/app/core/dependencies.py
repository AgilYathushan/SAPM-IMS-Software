from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.security import decode_access_token

security = HTTPBearer(auto_error=False)

def get_token_from_request(request: Request) -> Optional[str]:
    """Extract token from Authorization header manually to avoid FastAPI validation issues."""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.replace("Bearer ", "").strip()
    return token if token else None

def get_current_user_id(
    request: Request,
    db: Session = Depends(get_db),
    allow_inactive: bool = False
) -> str:
    # Extract user ID (business identifier) from JWT token and check if user is active
    # Block inactive users except for profile page (allow_inactive=True)
    token = get_token_from_request(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")  # Business identifier string (e.g., "USR-000001")
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
        request: Request,
        db: Session = Depends(get_db)
    ):
        token = get_token_from_request(request)
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
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
        # Normalize roles to lowercase strings for comparison
        user_role_normalized = str(user_role).lower() if user_role else None
        allowed_role_strings = [str(role).lower() for role in allowed_roles]
        if user_role_normalized not in allowed_role_strings:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Not enough permissions. Required roles: {allowed_role_strings}, User role: {user_role}"
            )
        user_id = payload.get("sub")  # Business identifier string
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )
        return user_id
    return role_checker

