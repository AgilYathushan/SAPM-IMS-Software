# Authentication API Routes
# Handles authentication and JWT management only

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.user import UserLogin, UserResponse
from app.services.auth_service import (
    authenticate_user,
    create_access_token_for_user
)
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services.workflow_logger import log_workflow_action_async

router = APIRouter()

@router.post("/login")
def login(credentials: UserLogin, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # User login endpoint - validates credentials and issues JWT
    user_data = authenticate_user(db, credentials.username, credentials.password)
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token_for_user(user_data)
    
    # Log user login action
    user_id = user_data.get("user_id")  # Use business identifier
    if user_id:  # Only log for regular users, not admin
        background_tasks.add_task(
            log_workflow_action_async,
            user_id,
            "User Login",
            "USER",  # Entity type is USER
            user_id  # Relevant ID is the user_id
        )
    
    # Return token along with user info
    user_id = user_data.get("user_id")  # Business identifier (None for admin)
    is_admin = user_data.get("is_admin", False)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,  # Backward compatibility (None for admin)
            "user_id": user_id,  # Business identifier (None for admin)
            "username": user_data["username"],
            "email": user_data.get("email"),
            "name": user_data["name"],
            "role": user_data["user_role"].value if hasattr(user_data["user_role"], "value") else str(user_data["user_role"]),
            "is_active": user_data["is_active"],
            "is_admin": is_admin  # Include is_admin flag
        }
    }

@router.get("/me")
def get_current_user_info(current_user = Depends(get_current_user)):
    # Get current authenticated user information
    # Handle both User object and admin dict
    if isinstance(current_user, dict):
        user_id = current_user.get("user_id") or current_user.get("id")  # Business identifier
        return {
            "id": user_id,  # Backward compatibility
            "user_id": user_id,  # Business identifier
            "username": current_user["username"],
            "email": current_user["email"],
            "name": current_user["name"],
            "role": current_user["user_role"].value if hasattr(current_user["user_role"], "value") else str(current_user["user_role"]),
            "is_active": current_user["is_active"]
        }
    # User object - return as dict with user_id
    return {
        "id": current_user.user_id,  # Backward compatibility
        "user_id": current_user.user_id,  # Business identifier
        "username": current_user.username,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.user_role.value if hasattr(current_user.user_role, "value") else str(current_user.user_role),
        "is_active": current_user.is_active,
        "created_at": current_user.created_at,
        "updated_at": current_user.updated_at
    }

