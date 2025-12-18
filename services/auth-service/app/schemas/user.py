from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
from app.models.user import UserRole

class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: UserRole

class UserCreate(UserBase):
    password: str
    name: Optional[str] = None

class UserResponse(UserBase):
    user_id: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class PasswordResetRequest(BaseModel):
    username: str
    email: str
    new_password: str

class PasswordResetResponse(BaseModel):
    message: str

