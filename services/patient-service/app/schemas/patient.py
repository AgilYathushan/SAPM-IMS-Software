# Patient Service Schemas
# Patient-specific attributes only (common attributes come from User)

from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional

class PatientBase(BaseModel):
    date_of_birth: date
    conditions: Optional[list[str]] = None

class PatientCreate(PatientBase):
    user_id: str  # Business identifier

class PatientUpdate(BaseModel):
    date_of_birth: Optional[date] = None
    conditions: Optional[list[str]] = None

class PatientResponse(PatientBase):
    patient_id: str  # Primary key (business identifier)
    user_id: str  # Business identifier
    # User attributes (fetched from User table)
    username: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    user_role: Optional[str] = None
    is_active: Optional[bool] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

