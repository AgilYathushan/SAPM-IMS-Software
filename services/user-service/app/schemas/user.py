# User Service Schemas

from pydantic import BaseModel, EmailStr
from datetime import datetime, date
from typing import Optional, List
from app.models.user import UserRole

class UserBase(BaseModel):
    username: str
    email: EmailStr
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    user_role: UserRole

class UserCreate(UserBase):
    """
    User registration schema.
    
    Common attributes (from UserBase) are saved in the User table:
    - username, email, name, phone, address, user_role
    
    Patient-specific attributes are saved in the Patient table:
    - date_of_birth (required for patients), conditions
    
    Medical staff-specific attributes are saved in the Medical Staff table:
    - department, license_no, specialization
    """
    password: str
    # Patient-specific fields - saved in patient_service.patients table
    date_of_birth: Optional[date] = None
    conditions: Optional[List[str]] = None
    # Medical staff-specific fields - saved in medical_staff_service.medical_staff table
    department: Optional[str] = None
    license_no: Optional[str] = None
    specialization: Optional[str] = None

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    user_role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class PasswordResetRequest(BaseModel):
    username: str
    email: str
    new_password: str

class PasswordResetResponse(BaseModel):
    message: str

class UserResponse(UserBase):
    user_id: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

