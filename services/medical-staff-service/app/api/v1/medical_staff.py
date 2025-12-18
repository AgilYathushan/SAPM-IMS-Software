# Medical Staff API Routes

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.schemas.medical_staff import MedicalStaffCreate, MedicalStaffUpdate, MedicalStaffResponse
from app.models.medical_staff import MedicalStaff
from app.services.medical_staff_service import (
    create_medical_staff,
    get_medical_staff,
    update_medical_staff,
    delete_medical_staff,
    get_all_medical_staff,
    get_medical_staff_by_user_id
)
from app.core.dependencies import UserRole

router = APIRouter()

@router.post("", response_model=MedicalStaffResponse, status_code=status.HTTP_201_CREATED)
def create_medical_staff_endpoint(
    staff: MedicalStaffCreate,
    db: Session = Depends(get_db)
):
    # Create a new medical staff member - allow self-registration (no auth required for registration)
    # During registration, user service will call this endpoint
    # For now, allow creation without auth check (will be validated by user service)
    return create_medical_staff(db, staff)

@router.get("", response_model=List[MedicalStaffResponse])
def get_all_medical_staff_endpoint(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.ADMIN, UserRole.DOCTOR, UserRole.RADIOLOGIST))
):
    # Get all medical staff
    return get_all_medical_staff(db, skip, limit, active_only=active_only, role_filter=role)

@router.get("/{staff_id}", response_model=MedicalStaffResponse)
def get_medical_staff_endpoint(
    staff_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Get medical staff by business identifier
    return get_medical_staff(db, staff_id)

@router.get("/by-user/{user_id}", response_model=MedicalStaffResponse)
def get_medical_staff_by_user_endpoint(
    user_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Get medical staff by user_id
    return get_medical_staff_by_user_id(db, user_id)

@router.put("/{staff_id}", response_model=MedicalStaffResponse)
def update_medical_staff_endpoint(
    staff_id: str,
    staff_update: MedicalStaffUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Update medical staff - allow users to update their own profile or admin to update any
    # Get the medical staff record to check ownership
    staff = db.query(MedicalStaff).filter(MedicalStaff.staff_id == staff_id).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medical staff not found"
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
    
    # Allow if admin or same user (staff.user_id matches current_user_id)
    if not is_admin and current_user_id != staff.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    return update_medical_staff(db, staff_id, staff_update)

@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medical_staff_endpoint(
    staff_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(UserRole.ADMIN))
):
    # Delete medical staff (Admin only) by business identifier
    delete_medical_staff(db, staff_id)
    return None

