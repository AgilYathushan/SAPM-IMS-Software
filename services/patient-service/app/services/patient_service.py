# Patient Service
# Business logic for patient management - fetches from patient table and user table via FK

from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException, status
from app.models.patient import Patient
from app.schemas.patient import PatientCreate, PatientUpdate
from datetime import datetime

def generate_patient_id(db: Session) -> str:
    """Generate unique patient ID string (e.g., PAT-000001)"""
    last_patient = db.query(Patient).filter(Patient.patient_id.like('PAT-%')).order_by(Patient.patient_id.desc()).first()
    
    if last_patient:
        try:
            last_num = int(last_patient.patient_id.split('-')[-1])
            sequential_num = last_num + 1
        except (ValueError, IndexError):
            sequential_num = 1
    else:
        sequential_num = 1
    
    patient_id = f"PAT-{sequential_num:06d}"
    
    # Ensure uniqueness
    while db.query(Patient).filter(Patient.patient_id == patient_id).first():
        sequential_num += 1
        patient_id = f"PAT-{sequential_num:06d}"
    
    return patient_id

def create_patient(db: Session, patient: PatientCreate) -> dict:
    # Create a new patient record
    if db.query(Patient).filter(Patient.user_id == patient.user_id).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Patient record already exists for this user"
        )
    
    # Generate business identifier
    patient_id = generate_patient_id(db)
    
    db_patient = Patient(
        patient_id=patient_id,
        user_id=patient.user_id,
        date_of_birth=patient.date_of_birth,
        conditions=patient.conditions
    )
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    
    # Fetch user data and combine
    return get_patient_with_user(db, db_patient.patient_id)  # Use business identifier

def get_patient_with_user(db: Session, patient_id: str) -> dict:
    # Get patient by business identifier and fetch user data via FK
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    # Fetch user data from user_service schema using raw SQL
    user_result = db.execute(
        text("SELECT user_id, username, email, name, phone, address, user_role, is_active FROM user_service.users WHERE user_id = :user_id"),
        {"user_id": patient.user_id}
    ).first()
    
    if not user_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found for this patient"
        )
    
    # Combine patient and user data
    # Convert user_role enum to string if needed
    user_role_value = user_result.user_role
    if hasattr(user_role_value, 'value'):
        user_role_value = user_role_value.value
    elif not isinstance(user_role_value, str):
        user_role_value = str(user_role_value)
    
    return {
        "patient_id": patient.patient_id,  # Primary key
        "user_id": patient.user_id,
        "date_of_birth": patient.date_of_birth,  # Pydantic will serialize date objects automatically
        "conditions": patient.conditions,
        "username": user_result.username,
        "email": user_result.email,
        "name": user_result.name,
        "phone": user_result.phone,
        "address": user_result.address,
        "user_role": user_role_value,
        "is_active": user_result.is_active,
        "created_at": patient.created_at,
        "updated_at": patient.updated_at
    }

def get_patient(db: Session, patient_id: str) -> dict:
    # Get patient by ID with user data
    return get_patient_with_user(db, patient_id)

def get_patient_by_user_id(db: Session, user_id: str) -> dict:
    # Get patient by user_id with user data
    patient = db.query(Patient).filter(Patient.user_id == user_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    return get_patient_with_user(db, patient.patient_id)  # Use business identifier

def update_patient(db: Session, patient_id: str, patient_update: PatientUpdate) -> dict:
    # Update patient by business identifier
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    update_data = patient_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(patient, field, value)
    patient.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(patient)
    
    return get_patient_with_user(db, patient.patient_id)  # Use business identifier

def delete_patient(db: Session, patient_id: str) -> None:
    # Delete patient by business identifier
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    db.delete(patient)
    db.commit()

def get_all_patients(db: Session, skip: int = 0, limit: int = 100, active_only: bool = False):
    # Get all patients with user data
    patients = db.query(Patient).offset(skip).limit(limit).all()
    
    # Fetch user data for each patient
    result = []
    for patient in patients:
        try:
            patient_data = get_patient_with_user(db, patient.patient_id)  # Use business identifier
            # Filter by active if requested
            if not active_only or patient_data.get("is_active"):
                result.append(patient_data)
        except HTTPException:
            continue  # Skip if user not found
    
    return result

