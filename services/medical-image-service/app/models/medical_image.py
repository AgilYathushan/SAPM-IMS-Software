from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func  
import enum
from app.core.database import Base

class ImageType(str, enum.Enum):
    MRI = "mri"
    CT = "ct"
    XRAY = "xray"

class ImageStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    READY = "ready"
    ARCHIVED = "archived"

class MedicalImage(Base):
    __tablename__ = "medical_images"
    __table_args__ = {"schema": "medical_image_service"}

    image_id = Column(String(10), primary_key=True, index=True, nullable=False)  # Business identifier: IMG-000001 (Primary Key)
    patient_id = Column(String(10), ForeignKey("patient_service.patients.patient_id", use_alter=True), nullable=False)
    uploaded_by = Column(String(10), ForeignKey("medical_staff_service.medical_staff.staff_id", use_alter=True), nullable=False)
    medical_test_id = Column(String(10), ForeignKey("medical_test_service.medical_tests.medical_test_id", use_alter=True), nullable=True)
    image_type = Column(Enum(ImageType, native_enum=False), nullable=False)
    img_url = Column(String(500), nullable=False)
    image_url = Column(String(500), nullable=False)
    status = Column(Enum(ImageStatus, native_enum=False), default=ImageStatus.UPLOADED)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer)
    description = Column(Text)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

