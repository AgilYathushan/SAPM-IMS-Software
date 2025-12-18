# Medical Staff Model
# Defines the Medical Staff database table - child class of User

from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base

class Department(str, enum.Enum):
    RADIOLOGY = "radiology"
    CARDIOLOGY = "cardiology"
    NEUROLOGY = "neurology"
    ORTHOPEDICS = "orthopedics"
    GENERAL = "general"

class MedicalStaff(Base):
    __tablename__ = "medical_staff"
    __table_args__ = {"schema": "medical_staff_service"}

    staff_id = Column(String(10), primary_key=True, index=True, nullable=False)  # Business identifier: STA-000001 (Primary Key)
    user_id = Column(String(10), ForeignKey("user_service.users.user_id", use_alter=True), unique=True, nullable=False)
    department = Column(String(50), nullable=True)  # Store as string, convert to enum in service layer
    license_no = Column(String(50), unique=True, nullable=True)
    specialization = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    @property
    def department_enum(self):
        """Convert string department to enum"""
        if self.department:
            try:
                return Department(self.department.lower())
            except ValueError:
                return None
        return None
    
    @department_enum.setter
    def department_enum(self, value):
        """Set department from enum"""
        if isinstance(value, Department):
            self.department = value.value
        elif isinstance(value, str):
            self.department = value.lower()
        else:
            self.department = None

