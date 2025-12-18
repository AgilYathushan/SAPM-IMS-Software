# Workflow API Routes
# Handles workflow logging for all system actions

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.core.dependencies import get_current_user_id, require_role
from app.schemas.workflow import WorkflowLogCreate, WorkflowLogResponse
from app.services.workflow_service import (
    create_workflow_log,
    create_workflow_log_async,
    get_all_workflow_logs,
    get_workflow_logs_by_user
)

router = APIRouter()

# Workflow Log Endpoints
@router.post("/logs", response_model=WorkflowLogResponse, status_code=status.HTTP_201_CREATED)
def create_workflow_log_endpoint(
    log_data: WorkflowLogCreate,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db)
):
    # Create a workflow log entry
    # Allow both authenticated calls (from frontend) and internal service calls
    # For authenticated calls: use current_user_id from token
    # For internal calls: use user_id from request body
    
    # Try to get user_id from token (optional - don't fail if no token)
    current_user_id = None
    try:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "").strip()
            from app.core.security import decode_access_token
            payload = decode_access_token(token)
            if payload:
                current_user_id = payload.get("sub")  # Business identifier string
    except:
        pass  # Ignore errors - this is an optional authentication
    
    # Determine user_id - prefer from token, fallback to request body
    user_id = current_user_id or log_data.user_id
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User ID is required for workflow logging"
        )
    
    # Convert entity_type string to enum if provided
    from app.models.workflow import EntityType
    entity_type_enum = None
    if log_data.entity_type:
        if isinstance(log_data.entity_type, str):
            try:
                entity_type_enum = EntityType(log_data.entity_type.upper())
            except ValueError:
                entity_type_enum = None
        else:
            entity_type_enum = log_data.entity_type
    
    # Generate log_id before creating the log (so we can return it immediately)
    from app.services.workflow_service import generate_log_id
    log_id = generate_log_id(db)
    
    # Use background task for async execution to avoid blocking
    # Pass log_id to ensure it matches what we return
    background_tasks.add_task(
        create_workflow_log_async, 
        user_id, 
        log_data.action, 
        entity_type_enum, 
        log_data.relevant_id,
        log_id  # Pass the generated log_id
    )
    # Return immediately with success message (using generated log_id)
    return {
        "log_id": log_id,  # Primary key (business identifier)
        "user_id": user_id,  # Business identifier
        "action": log_data.action,
        "entity_type": entity_type_enum.value if entity_type_enum else None,
        "relevant_id": log_data.relevant_id,  # Business identifier
        "timestamp": datetime.utcnow()
    }

@router.get("/logs", response_model=List[WorkflowLogResponse])
def get_all_workflow_logs_endpoint(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_role("admin"))
):
    # Get all workflow logs (Admin only)
    return get_all_workflow_logs(db, skip, limit)

@router.get("/logs/user/{user_id}", response_model=List[WorkflowLogResponse])
def get_user_workflow_logs_endpoint(
    user_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    # Get workflow logs for a user
    # Users can only view their own logs unless admin
    # For now, allow if authenticated (admin check can be added later if needed)
    return get_workflow_logs_by_user(db, user_id, skip, limit)
