from pydantic import BaseModel, ConfigDict  # Pydantic models for data validation
from datetime import datetime  # DateTime type for timestamps
from typing import Optional  # Optional type hinting
from app.models.diagnostic_report import ReportStatus  # Report status enum

class DiagnosticReportBase(BaseModel):
    findings: Optional[str] = None
    diagnosis: Optional[str] = None
    recommendations: Optional[str] = None

class DiagnosticReportCreate(DiagnosticReportBase):
    patient_id: str
    image_id: str
    radiologist_id: str
    medical_test_id: Optional[str] = None
    status: ReportStatus = ReportStatus.PRELIMINARY

class DiagnosticReportUpdate(BaseModel):
    findings: Optional[str] = None
    diagnosis: Optional[str] = None
    recommendations: Optional[str] = None
    status: Optional[ReportStatus] = None

class DiagnosticReportResponse(DiagnosticReportBase):
    model_config = ConfigDict(from_attributes=True)
    
    report_id: str
    patient_id: str
    image_id: str
    doctor_id: str
    radiologist_id: str
    medical_test_id: Optional[str] = None
    status: ReportStatus
    diagnosis: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    finalized_at: Optional[datetime] = None

