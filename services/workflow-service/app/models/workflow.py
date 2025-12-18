from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
import enum
from app.core.database import Base

class EntityType(str, enum.Enum):
    USER = "USER"
    PATIENT = "PATIENT"
    REPORT = "REPORT"
    BILL = "BILL"
    MEDICAL_TEST = "MEDICAL_TEST"
    IMAGE = "IMAGE"
    NONE = "NONE"  # For actions like login/registration that don't have a relevant entity

class WorkflowLog(Base):
    __tablename__ = "workflow_logs"
    __table_args__ = {"schema": "workflow_service"}

    log_id = Column(String(10), primary_key=True, index=True, nullable=False)  # Business identifier: LOG-000001 (Primary Key)
    user_id = Column(String(10), ForeignKey("user_service.users.user_id", use_alter=True), nullable=False)
    action = Column(String(255), nullable=False)  # Short action description (e.g., "User Login", "Create Report")
    entity_type = Column(Enum(EntityType, native_enum=False), nullable=True)  # Type of entity referenced by relevant_id
    relevant_id = Column(String(20), nullable=True)  # Business identifier of related entity (report_id, patient_id, medical_test_id, etc.) - VARCHAR(20) to accommodate longer IDs like TEST-000005
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
