# Patient API Routes

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.schemas.patient import PatientCreate, PatientUpdate, PatientResponse
from app.models.patient import Patient
from app.services.patient_service import (
    create_patient,
    get_patient,
    update_patient,
    delete_patient,
    get_all_patients,
    get_patient_by_user_id
)
from app.core.dependencies import UserRole

router = APIRouter()

@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient_endpoint(
    patient: PatientCreate,
    db: Session = Depends(get_db)
):
    # Create a new patient - allow self-registration (no auth required for registration)
    # During registration, user service will call this endpoint
    # For now, allow creation without auth check (will be validated by user service)
    return create_patient(db, patient)

@router.get("", response_model=List[PatientResponse])
def get_all_patients_endpoint(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.ADMIN, UserRole.DOCTOR, UserRole.RADIOLOGIST))
):
    # Get all patients (Admin, Doctor, Radiologist only)
    return get_all_patients(db, skip, limit, active_only=active_only)

@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient_endpoint(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Get patient by business identifier
    patient = get_patient(db, patient_id)
    
    # Check permissions - patients can only view their own record unless staff
    is_admin = False
    current_user_id = None
    current_user_role = None
    
    if isinstance(current_user, dict):
        is_admin = current_user.get("is_admin", False)
        current_user_id = current_user.get("user_id") or current_user.get("id")  # Support both for backward compatibility
        current_user_role = current_user.get("user_role")
    else:
        # current_user is a string (user_id business identifier)
        current_user_id = current_user
        is_admin = False
        # Need to fetch user role from database
        from sqlalchemy import text
        user_result = db.execute(
            text("SELECT user_role FROM user_service.users WHERE user_id = :user_id"),
            {"user_id": current_user_id}
        ).first()
        current_user_role = user_result[0] if user_result else None
    
    # Allow if admin, doctor, radiologist, or same user
    if not is_admin and current_user_id:
        try:
            user_patient = get_patient_by_user_id(db, current_user_id)
            if user_patient["patient_id"] != patient_id:
                # Check if user is staff
                if current_user_role not in [UserRole.DOCTOR.value, UserRole.RADIOLOGIST.value]:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Not enough permissions"
                    )
        except HTTPException:
            # User is not a patient, check if staff
            if current_user_role not in [UserRole.DOCTOR.value, UserRole.RADIOLOGIST.value]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not enough permissions"
                )
    
    return patient

@router.get("/by-user/{user_id}", response_model=PatientResponse)
def get_patient_by_user_endpoint(
    user_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Get patient by user_id - patients can only view their own record
    is_admin = False
    current_user_id = None
    
    if isinstance(current_user, dict):
        is_admin = current_user.get("is_admin", False)
        current_user_id = current_user.get("user_id") or current_user.get("id")  # Support both for backward compatibility
    else:
        # current_user is a string (user_id business identifier)
        current_user_id = current_user
        is_admin = False
    
    if not is_admin and current_user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own patient record"
        )
    return get_patient_by_user_id(db, user_id)

@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient_endpoint(
    patient_id: str,
    patient_update: PatientUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Update patient - allow patients to update their own profile or admin to update any
    # Get the patient record to check ownership
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    # Check permissions
    is_admin = False
    current_user_id = None
    
    if isinstance(current_user, dict):
        is_admin = current_user.get("is_admin", False)
        current_user_id = None  # Admin doesn't have user_id
    else:
        # current_user is a string (user_id business identifier)
        current_user_id = current_user
    
    # Allow if admin or same user (patient.user_id matches current_user_id)
    if not is_admin and current_user_id != patient.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to update this patient record"
        )
    
    return update_patient(db, patient_id, patient_update)

@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient_endpoint(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.ADMIN))
):
    # Delete patient (Admin only) by business identifier
    delete_patient(db, patient_id)
    return None
