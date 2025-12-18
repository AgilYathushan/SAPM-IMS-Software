from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.medical_test import MedicalTestStatus

class MedicalTestBase(BaseModel):
    test_type: str  # e.g., "CT Scan", "XRAY", "MRI"
    notes: Optional[str] = None

class MedicalTestCreate(MedicalTestBase):
    patient_id: str  # Business identifier: PAT-000001
    radiologist_id: Optional[str] = None  # Business identifier: STA-000001

class MedicalTestUpdate(BaseModel):
    status: Optional[MedicalTestStatus] = None
    notes: Optional[str] = None

class MedicalTestResponse(MedicalTestBase):
    model_config = ConfigDict(from_attributes=True)
    
    medical_test_id: str
    patient_id: str  # Business identifier: PAT-000001
    doctor_id: str  # Business identifier: STA-000001
    radiologist_id: Optional[str] = None  # Business identifier: STA-000001
    status: MedicalTestStatus
    requested_at: datetime
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

