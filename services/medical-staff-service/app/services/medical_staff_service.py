# Medical Staff Service
# Business logic for medical staff management - fetches from medical_staff table and user table via FK

from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from app.models.medical_staff import MedicalStaff
from app.schemas.medical_staff import MedicalStaffCreate, MedicalStaffUpdate
from datetime import datetime

def generate_staff_id(db: Session) -> str:
    """Generate unique staff ID string (e.g., STA-000001)"""
    last_staff = db.query(MedicalStaff).filter(MedicalStaff.staff_id.like('STA-%')).order_by(MedicalStaff.staff_id.desc()).first()
    
    if last_staff:
        try:
            last_num = int(last_staff.staff_id.split('-')[-1])
            sequential_num = last_num + 1
        except (ValueError, IndexError):
            sequential_num = 1
    else:
        sequential_num = 1
    
    staff_id = f"STA-{sequential_num:06d}"
    
    # Ensure uniqueness
    while db.query(MedicalStaff).filter(MedicalStaff.staff_id == staff_id).first():
        sequential_num += 1
        staff_id = f"STA-{sequential_num:06d}"
    
    return staff_id

def create_medical_staff(db: Session, staff: MedicalStaffCreate) -> dict:
    # Create a new medical staff record
    if db.query(MedicalStaff).filter(MedicalStaff.user_id == staff.user_id).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Medical staff record already exists for this user"
        )
    
    # Convert department enum to string value if it's an enum
    dept_value = staff.department
    if hasattr(dept_value, 'value'):
        dept_value = dept_value.value
    elif isinstance(dept_value, str):
        dept_value = dept_value.lower()
    
    # Generate business identifier
    staff_id = generate_staff_id(db)
    
    # Check if license_no already exists
    if staff.license_no:
        existing_staff = db.query(MedicalStaff).filter(MedicalStaff.license_no == staff.license_no).first()
        if existing_staff:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"License number '{staff.license_no}' is already registered to another medical staff member"
            )
    
    db_staff = MedicalStaff(
        staff_id=staff_id,
        user_id=staff.user_id,
        department=dept_value,
        license_no=staff.license_no,
        specialization=staff.specialization
    )
    db.add(db_staff)
    
    try:
        db.commit()
        db.refresh(db_staff)
    except IntegrityError as e:
        db.rollback()
        # Check if it's a license_no unique constraint violation
        error_str = str(e.orig) if hasattr(e, 'orig') else str(e)
        if 'license_no_key' in error_str or 'license_no' in error_str.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"License number '{staff.license_no}' is already registered to another medical staff member"
            )
        # Re-raise if it's a different integrity error
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database constraint violation: {error_str}"
        )
    
    # Fetch user data and combine
    return get_medical_staff_with_user(db, db_staff.staff_id)  # Use business identifier

def get_medical_staff_with_user(db: Session, staff_id: str) -> dict:
    # Get medical staff by business identifier and fetch user data via FK
    staff = db.query(MedicalStaff).filter(MedicalStaff.staff_id == staff_id).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medical staff not found"
        )
    
    # Fetch user data from user_service schema using raw SQL
    user_result = db.execute(
        text("SELECT user_id, username, email, name, phone, address, user_role, is_active FROM user_service.users WHERE user_id = :user_id"),
        {"user_id": staff.user_id}
    ).first()
    
    if not user_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found for this medical staff"
        )
    
    # Combine medical staff and user data
    # Convert user_role enum to string if needed
    user_role_value = user_result.user_role
    if hasattr(user_role_value, 'value'):
        user_role_value = user_role_value.value
    elif not isinstance(user_role_value, str):
        user_role_value = str(user_role_value)
    
    # Department is now stored as string, return as-is
    dept_value = staff.department if staff.department else None
    
    return {
        "staff_id": staff.staff_id,  # Primary key
        "user_id": staff.user_id,
        "department": dept_value,
        "license_no": staff.license_no,
        "specialization": staff.specialization,
        "username": user_result.username,
        "email": user_result.email,
        "name": user_result.name,
        "phone": user_result.phone,
        "address": user_result.address,
        "user_role": user_role_value,
        "is_active": user_result.is_active,
        "created_at": staff.created_at,
        "updated_at": staff.updated_at
    }

def get_medical_staff(db: Session, staff_id: str) -> dict:
    # Get medical staff by business identifier with user data
    return get_medical_staff_with_user(db, staff_id)

def get_medical_staff_by_user_id(db: Session, user_id: str) -> dict:
    # Get medical staff by user_id with user data
    staff = db.query(MedicalStaff).filter(MedicalStaff.user_id == user_id).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medical staff not found"
        )
    return get_medical_staff_with_user(db, staff.staff_id)  # Use business identifier

def update_medical_staff(db: Session, staff_id: str, staff_update: MedicalStaffUpdate) -> dict:
    # Update medical staff by business identifier
    staff = db.query(MedicalStaff).filter(MedicalStaff.staff_id == staff_id).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medical staff not found"
        )
    
    update_data = staff_update.dict(exclude_unset=True)
    # Map license_no to license_no in model
    if "license_no" in update_data:
        staff.license_no = update_data.pop("license_no")
    
    for field, value in update_data.items():
        setattr(staff, field, value)
    staff.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(staff)
    
    return get_medical_staff_with_user(db, staff.staff_id)  # Use business identifier

def delete_medical_staff(db: Session, staff_id: str) -> None:
    # Delete medical staff by business identifier
    staff = db.query(MedicalStaff).filter(MedicalStaff.staff_id == staff_id).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medical staff not found"
        )
    db.delete(staff)
    db.commit()

def get_all_medical_staff(db: Session, skip: int = 0, limit: int = 100, active_only: bool = False, role_filter: str = None):
    # Get all medical staff with user data
    staff_list = db.query(MedicalStaff).offset(skip).limit(limit).all()
    
    # Fetch user data for each staff member
    result = []
    for staff in staff_list:
        try:
            staff_data = get_medical_staff_with_user(db, staff.staff_id)  # Use business identifier
            # Filter by active if requested
            if active_only and not staff_data.get("is_active"):
                continue
            # Filter by role if requested (case-insensitive comparison)
            if role_filter:
                staff_role = staff_data.get("user_role", "")
                # Normalize both to lowercase for comparison
                if isinstance(staff_role, str):
                    staff_role_lower = staff_role.lower()
                elif hasattr(staff_role, 'value'):
                    staff_role_lower = staff_role.value.lower()
                else:
                    staff_role_lower = str(staff_role).lower()
                
                role_filter_lower = role_filter.lower() if isinstance(role_filter, str) else str(role_filter).lower()
                if staff_role_lower != role_filter_lower:
                    continue
            result.append(staff_data)
        except HTTPException:
            continue  # Skip if user not found
    
    return result

