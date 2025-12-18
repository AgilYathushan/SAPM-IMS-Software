from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.workflow import EntityType

class WorkflowLogCreate(BaseModel):
    user_id: Optional[str] = None  # For internal service calls (business identifier)
    action: str
    entity_type: Optional[str] = None  # Accept as string, will be converted to enum in endpoint
    relevant_id: Optional[str] = None  # Business identifier

class WorkflowLogResponse(BaseModel):
    log_id: str  # Primary key (business identifier)
    user_id: str  # Business identifier
    action: str
    entity_type: Optional[str] = None  # Will be the enum value as string
    relevant_id: Optional[str] = None  # Business identifier
    timestamp: datetime

    class Config:
        from_attributes = True
