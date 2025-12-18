from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.medical_image import ImageType, ImageStatus

class MedicalImageBase(BaseModel):
    image_type: ImageType
    description: Optional[str] = None

class MedicalImageCreate(MedicalImageBase):
    patient_id: str  # Business identifier: PAT-000001
    file_name: str
    file_size: Optional[int] = None
    medical_test_id: Optional[str] = None  # Business identifier: TEST-YYYYMMDD-XXX

class MedicalImageUpdate(BaseModel):
    status: Optional[ImageStatus] = None
    description: Optional[str] = None

class MedicalImageResponse(MedicalImageBase):
    model_config = ConfigDict(from_attributes=True)
    
    patient_id: str  # Business identifier: PAT-000001
    image_id: str
    image_url: str
    status: ImageStatus
    file_name: str
    file_size: Optional[int] = None
    uploaded_by: Optional[str] = None  # Business identifier: STA-000001
    medical_test_id: Optional[str] = None  # Business identifier: TEST-YYYYMMDD-XXX
    uploaded_at: datetime
    updated_at: Optional[datetime] = None

class ImageUploadResponse(BaseModel):
    image_id: str
    image_url: str
    message: str

