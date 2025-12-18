# User Management API Routes
# Handles all user CRUD operations

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Union
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.schemas.user import UserCreate, UserUpdate, UserResponse, PasswordResetRequest, PasswordResetResponse
from app.services.user_service import (
    create_user,
    get_user,
    get_all_users,
    update_user,
    reset_password,
    delete_user
)
from app.services.workflow_logger import log_workflow_action_async
from app.models.user import User, UserRole

router = APIRouter()
security = HTTPBearer()

# Helper dependency for profile endpoints that allow inactive users
def get_current_user_allow_inactive(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    # Allow inactive users to access their profile
    return get_current_user(credentials, db, allow_inactive=True)

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user_endpoint(
    user: UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    # Create a new user account (public registration)
    new_user = create_user(db, user)
    
    # Log user registration action
    from app.services.workflow_logger import log_workflow_action_async
    background_tasks.add_task(
        log_workflow_action_async,
        new_user.user_id,  # Use business identifier
        "User Registration",
        "USER",  # Entity type is USER
        new_user.user_id  # Relevant ID is the user_id
    )
    
    return new_user

@router.get("", response_model=List[UserResponse])
def get_all_users_endpoint(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.ADMIN))
):
    # Get all users (Admin only)
    return get_all_users(db, skip, limit)

@router.get("/{user_id}", response_model=UserResponse)
def get_user_endpoint(
    user_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_allow_inactive)
):
    # Get user by business identifier - allow inactive users to view their own profile
    # Check if admin or same user
    is_admin = False
    current_user_id = None
    
    if isinstance(current_user, dict):
        is_admin = current_user.get("is_admin", False)
    else:
        current_user_id = current_user.user_id  # Use business identifier
        is_admin = current_user.user_role == UserRole.ADMIN
    
    if not is_admin and current_user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return get_user(db, user_id)

@router.put("/{user_id}", response_model=UserResponse)
def update_user_endpoint(
    user_id: str,
    user_update: UserUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_allow_inactive)
):
    # Update user - allow inactive users to update their own profile
    # Check if admin or same user
    is_admin = False
    current_user_id = None
    
    if isinstance(current_user, dict):
        is_admin = current_user.get("is_admin", False)
        current_user_id = None  # Admin doesn't have user_id
    else:
        current_user_id = current_user.user_id  # Use business identifier
        is_admin = current_user.user_role == UserRole.ADMIN
    
    if not is_admin and current_user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    result = update_user(db, user_id, user_update)
    
    # Log workflow action asynchronously
    if current_user_id:
        if "is_active" in user_update.dict(exclude_unset=True):
            action = "Activate User" if user_update.is_active else "Deactivate User"
        else:
            action = "Update User"
        background_tasks.add_task(log_workflow_action_async, current_user_id, action, "USER", user_id)
    
    return result

@router.post("/reset-password", response_model=PasswordResetResponse, status_code=status.HTTP_200_OK)
def reset_password_endpoint(
    reset_data: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    # Reset user password by verifying username and email
    try:
        reset_password(db, reset_data.username, reset_data.email, reset_data.new_password)
        return {"message": "Password reset successfully. Please login with your new password."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset password: {str(e)}"
        )

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_endpoint(
    user_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.ADMIN))
):
    # Delete user (Admin only)
    delete_user(db, user_id)
    
    # Log workflow action asynchronously
    current_user_id = None
    if isinstance(current_user, dict):
        current_user_id = None  # Admin
    else:
        current_user_id = current_user.user_id if hasattr(current_user, 'user_id') else None
    
    if current_user_id:
        background_tasks.add_task(log_workflow_action_async, current_user_id, "Delete User", "USER", user_id)
    
    return None

