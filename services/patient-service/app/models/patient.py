# Patient Model
# Defines the Patient database table - child class of User

from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Patient(Base):
    __tablename__ = "patients"
    __table_args__ = {"schema": "patient_service"}

    patient_id = Column(String(10), primary_key=True, index=True, nullable=False)  # Business identifier: PAT-000001 (Primary Key)
    user_id = Column(String(10), ForeignKey("user_service.users.user_id", use_alter=True), unique=True, nullable=False)
    date_of_birth = Column(Date, nullable=False)
    conditions = Column(ARRAY(String), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

