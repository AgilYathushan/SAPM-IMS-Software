from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token

security = HTTPBearer()

def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    allow_inactive: bool = False
) -> str:
    # Extract user ID (business identifier) from JWT token and check activation status
    token = credentials.credentials
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
        if user_role not in [role.value if hasattr(role, 'value') else str(role) for role in allowed_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        user_id = payload.get("sub")  # Business identifier string
        return user_id
    return role_checker

