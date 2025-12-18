from sqlalchemy import Column, String, Enum, DateTime, ForeignKey, Text, Date  # SQLAlchemy column types for database schema
from sqlalchemy.sql import func  # SQL functions for database operations
import enum  # Enum support for status values
from app.core.database import Base  # Base class for SQLAlchemy models

class ReportStatus(str, enum.Enum):
    PRELIMINARY = "preliminary"
    CONFIRMED = "confirmed"
    BILLED = "billed"
    PAID = "paid"
    CANCELLED = "cancelled"

class DiagnosticReport(Base):
    __tablename__ = "diagnostic_reports"
    __table_args__ = {"schema": "diagnostic_report_service"}

    report_id = Column(String(10), primary_key=True, index=True, nullable=False)
    patient_id = Column(String(10), ForeignKey("patient_service.patients.patient_id", use_alter=True), nullable=False)
    doctor_id = Column(String(10), ForeignKey("medical_staff_service.medical_staff.staff_id", use_alter=True), nullable=False)
    radiologist_id = Column(String(10), ForeignKey("medical_staff_service.medical_staff.staff_id", use_alter=True), nullable=False)
    image_id = Column(String(10), ForeignKey("medical_image_service.medical_images.image_id", use_alter=True), nullable=False)
    medical_test_id = Column(String(10), ForeignKey("medical_test_service.medical_tests.medical_test_id", use_alter=True), nullable=True)
    findings = Column(Text)
    diagnosis = Column(Text)
    recommendations = Column(Text)
    status = Column(Enum(ReportStatus, native_enum=False), default=ReportStatus.PRELIMINARY)
    updated_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    finalized_at = Column(DateTime(timezone=True))

