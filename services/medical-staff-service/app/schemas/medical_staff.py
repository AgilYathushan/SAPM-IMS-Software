# Medical Staff Service Schemas
# Medical staff-specific attributes only (common attributes come from User)

from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.medical_staff import Department

class MedicalStaffBase(BaseModel):
    department: Optional[Department] = None
    license_no: Optional[str] = None
    specialization: Optional[str] = None

class MedicalStaffCreate(MedicalStaffBase):
    user_id: str  # Business identifier

class MedicalStaffUpdate(BaseModel):
    department: Optional[Department] = None
    license_no: Optional[str] = None
    specialization: Optional[str] = None

class MedicalStaffResponse(MedicalStaffBase):
    staff_id: str  # Primary key (business identifier)
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

