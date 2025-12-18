# User Model
# Defines the User database table for authentication service

from sqlalchemy import Column, Integer, String, Enum, DateTime, Boolean
from sqlalchemy.sql import func
import enum
from app.core.database import Base

# User Role Enumeration
class UserRole(str, enum.Enum):
    ADMIN = "admin"
    PATIENT = "patient"
    RADIOLOGIST = "radiologist"
    DOCTOR = "doctor"
    CASHIER = "cashier"

# User Model
class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "user_service"}

    user_id = Column(String(10), primary_key=True, index=True, nullable=False)  # Business identifier: USR-000001 (Primary Key)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    address = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    user_role = Column(Enum(UserRole, native_enum=False), nullable=False, default=UserRole.PATIENT)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Alias for backward compatibility
    @property
    def role(self):
        return self.user_role

