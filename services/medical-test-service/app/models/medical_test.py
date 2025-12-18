from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, Text, TypeDecorator
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base

class MedicalTestStatus(str, enum.Enum):
    REQUESTED = "requested"
    COMPLETED = "completed"
    REPORTING = "reporting" #after test is added for a the report
    CANCELLED = "cancelled"

class MedicalTestStatusType(TypeDecorator):
    """Custom type to handle MedicalTestStatus enum conversion"""
    impl = String(50)
    cache_ok = True
    
    def process_bind_param(self, value, dialect):
        """Convert enum to string when writing to database"""
        if value is None:
            return None
        if isinstance(value, MedicalTestStatus):
            return value.value
        if isinstance(value, str):
            # Validate it's a valid enum value
            try:
                MedicalTestStatus(value.lower())
                return value.lower()
            except ValueError:
                return value
        return str(value)
    
    def process_result_value(self, value, dialect):
        """Convert string to enum when reading from database"""
        if value is None:
            return None
        if isinstance(value, str):
            try:
                return MedicalTestStatus(value.lower())
            except ValueError:
                # If value doesn't match enum, return as-is or default
                return MedicalTestStatus.REQUESTED
        return value

class MedicalTest(Base):
    __tablename__ = "medical_tests"
    __table_args__ = {"schema": "medical_test_service"}

    medical_test_id = Column(String(10), primary_key=True, index=True, nullable=False)  # Business identifier: TEST-000001 (Primary Key)
    patient_id = Column(String(10), ForeignKey("patient_service.patients.patient_id", use_alter=True), nullable=False)
    doctor_id = Column(String(10), ForeignKey("medical_staff_service.medical_staff.staff_id", use_alter=True), nullable=False)
    radiologist_id = Column(String(10), ForeignKey("medical_staff_service.medical_staff.staff_id", use_alter=True), nullable=True)
    test_type = Column(String(50), nullable=False)  # e.g., "CT Scan", "XRAY", "MRI"
    status = Column(MedicalTestStatusType, default=MedicalTestStatus.REQUESTED)
    notes = Column(Text, nullable=True)
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

