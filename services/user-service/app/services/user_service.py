# User Service
# Business logic for user management operations - single source of truth for all users

from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import httpx
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash, verify_password
from app.core.config import settings

def generate_user_id(db: Session) -> str:
    """Generate unique user ID string (e.g., USR-000001)"""
    # Get the last user_id to find the highest number
    last_user = db.query(User).filter(User.user_id.like('USR-%')).order_by(User.user_id.desc()).first()
    
    if last_user:
        try:
            # Extract number from USR-000001 format
            last_num = int(last_user.user_id.split('-')[-1])
            sequential_num = last_num + 1
        except (ValueError, IndexError):
            sequential_num = 1
    else:
        sequential_num = 1
    
    user_id = f"USR-{sequential_num:06d}"
    
    # Ensure uniqueness
    while db.query(User).filter(User.user_id == user_id).first():
        sequential_num += 1
        user_id = f"USR-{sequential_num:06d}"
    
    return user_id

def create_user(db: Session, user: UserCreate) -> User:
    """
    Create a new user account.
    
    Common attributes are saved in the User table:
    - username, email, name, phone, address, password, user_role, is_active
    
    Role-specific attributes are saved in respective tables via HTTP calls:
    - Patient: date_of_birth, conditions → patient_service.patients
    - Medical Staff: department, license_no, specialization → medical_staff_service.medical_staff
    """
    # Check for duplicate username
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    # Check for duplicate email
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Generate business identifier
    user_id = generate_user_id(db)
    
    # Create user record with common attributes only
    db_user = User(
        user_id=user_id,
        username=user.username,
        email=user.email,
        name=user.name,
        phone=user.phone,
        address=user.address,
        hashed_password=get_password_hash(user.password),
        user_role=user.user_role,
        is_active=False  # New users are inactive by default
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create role-specific records via HTTP calls to respective services
    # Only role-specific attributes are sent to respective services
    # Common attributes (username, email, name, phone, address) are already in User table
    try:
        if user.user_role == UserRole.PATIENT:
            # Create patient record with patient-specific attributes only
            if not user.date_of_birth:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="date_of_birth is required for patient registration"
                )
            patient_data = {
                "user_id": db_user.user_id,  # Use business identifier
                "date_of_birth": user.date_of_birth.isoformat() if hasattr(user.date_of_birth, 'isoformat') else str(user.date_of_birth),
                "conditions": user.conditions or []
            }
            # Call patient service via HTTP - only patient-specific data
            _create_patient_record(patient_data)
        elif user.user_role in [UserRole.DOCTOR, UserRole.RADIOLOGIST, UserRole.CASHIER]:
            # Create medical staff record with medical staff-specific attributes only
            medical_staff_data = {
                "user_id": db_user.user_id,  # Use business identifier
                "department": user.department,
                "license_no": user.license_no,
                "specialization": user.specialization
            }
            # Call medical staff service via HTTP - only medical staff-specific data
            _create_medical_staff_record(medical_staff_data)
    except Exception as e:
        # If role-specific record creation fails, rollback user creation
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create role-specific record: {str(e)}"
        )
    
    return db_user

def _create_patient_record(patient_data: dict):
    # Create patient record via HTTP call to patient service through API gateway
    api_gateway_url = settings.API_GATEWAY_URL
    
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                f"{api_gateway_url}/api/v1/patients",
                json=patient_data,
                headers={"Content-Type": "application/json"}
            )
            if response.status_code not in [200, 201]:
                raise Exception(f"Patient service returned {response.status_code}: {response.text}")
    except httpx.RequestError as e:
        raise Exception(f"Failed to connect to patient service: {str(e)}")
    except Exception as e:
        raise Exception(f"Error creating patient record: {str(e)}")

def _create_medical_staff_record(medical_staff_data: dict):
    # Create medical staff record via HTTP call to medical staff service through API gateway
    api_gateway_url = settings.API_GATEWAY_URL
    
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                f"{api_gateway_url}/api/v1/medical-staff",
                json=medical_staff_data,
                headers={"Content-Type": "application/json"}
            )
            if response.status_code not in [200, 201]:
                raise Exception(f"Medical staff service returned {response.status_code}: {response.text}")
    except httpx.RequestError as e:
        raise Exception(f"Failed to connect to medical staff service: {str(e)}")
    except Exception as e:
        raise Exception(f"Error creating medical staff record: {str(e)}")

def get_user(db: Session, user_id: str) -> User:
    # Get user by business identifier
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

def get_user_by_username(db: Session, username: str) -> User:
    # Get user by username
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

def get_all_users(db: Session, skip: int = 0, limit: int = 100):
    # Get all users, ordered by user_id
    return db.query(User).order_by(User.user_id.asc()).offset(skip).limit(limit).all()

def update_user(db: Session, user_id: str, user_update: UserUpdate) -> User:
    # Update user
    user = get_user(db, user_id)
    update_data = user_update.dict(exclude_unset=True)
    
    # Handle password update separately if provided
    if "password" in update_data:
        user.hashed_password = get_password_hash(update_data.pop("password"))
    
    for field, value in update_data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user

def reset_password(db: Session, username: str, email: str, new_password: str) -> User:
    # Reset user password by username and email verification
    user = get_user_by_username(db, username)
    
    # Verify email matches
    if user.email.lower() != email.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email does not match the username"
        )
    
    # Update password
    user.hashed_password = get_password_hash(new_password)
    db.commit()
    db.refresh(user)
    return user

def delete_user(db: Session, user_id: str) -> None:
    # Delete user
    user = get_user(db, user_id)
    db.delete(user)
    db.commit()

