from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.workflow import WorkflowLog, EntityType
from app.schemas.workflow import WorkflowLogCreate
from datetime import datetime

def generate_log_id(db: Session) -> str:
    # Generate unique log ID string (e.g., "LOG-000001")
    last_log = db.query(WorkflowLog).filter(WorkflowLog.log_id.like('LOG-%')).order_by(WorkflowLog.log_id.desc()).first()
    
    if last_log:
        try:
            # Extract number from LOG-000001 format
            last_num = int(last_log.log_id.split('-')[-1])
            sequential_num = last_num + 1
        except (ValueError, IndexError):
            sequential_num = 1
    else:
        sequential_num = 1
    
    log_id = f"LOG-{sequential_num:06d}"
    
    # Ensure uniqueness
    while db.query(WorkflowLog).filter(WorkflowLog.log_id == log_id).first():
        sequential_num += 1
        log_id = f"LOG-{sequential_num:06d}"
    
    return log_id

def create_workflow_log(
    db: Session, 
    user_id: str, 
    action: str, 
    entity_type: EntityType = None, 
    relevant_id: str = None
) -> WorkflowLog:
    # Create a new workflow log entry
    log_id = generate_log_id(db)
    
    db_log = WorkflowLog(
        log_id=log_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        relevant_id=relevant_id,
        timestamp=datetime.utcnow()
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

def create_workflow_log_async(user_id: str, action: str, entity_type: EntityType = None, relevant_id: str = None, log_id: str = None):
    # Async version - creates log in background
    # This should be called via BackgroundTasks
    # Create a new database session for background task
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        # If log_id is provided, use it; otherwise generate a new one
        if log_id:
            # Create log with provided log_id
            db_log = WorkflowLog(
                log_id=log_id,
                user_id=user_id,
                action=action,
                entity_type=entity_type,
                relevant_id=relevant_id,
                timestamp=datetime.utcnow()
            )
            db.add(db_log)
            db.commit()
            db.refresh(db_log)
        else:
            # Generate new log_id if not provided
            create_workflow_log(db, user_id, action, entity_type, relevant_id)
    except Exception as e:
        # Log error but don't fail the main operation
        print(f"Error creating workflow log: {e}")
        import traceback
        print(traceback.format_exc())
    finally:
        db.close()

def get_all_workflow_logs(db: Session, skip: int = 0, limit: int = 100):
    # Get all workflow logs
    return db.query(WorkflowLog).order_by(WorkflowLog.timestamp.desc()).offset(skip).limit(limit).all()

def get_workflow_logs_by_user(db: Session, user_id: str, skip: int = 0, limit: int = 100):
    # Get workflow logs for a specific user
    return db.query(WorkflowLog).filter(
        WorkflowLog.user_id == user_id
    ).order_by(WorkflowLog.timestamp.desc()).offset(skip).limit(limit).all()
