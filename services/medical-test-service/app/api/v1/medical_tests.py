# Medical Test API Routes
# Handles all medical test operations

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from sqlalchemy import text
import httpx
from app.core.database import get_db
from app.core.dependencies import get_current_user_id, require_role
from app.core.config import settings
from app.schemas.medical_test import MedicalTestCreate, MedicalTestUpdate, MedicalTestResponse
from app.services.medical_test_service import (
    create_medical_test,
    get_medical_test,
    get_all_medical_tests,
    get_medical_tests_by_patient,
    update_medical_test
)

router = APIRouter()

@router.post("", response_model=MedicalTestResponse, status_code=status.HTTP_201_CREATED)
def create_medical_test_endpoint(
    medical_test: MedicalTestCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_role("doctor"))
):
    # Create a medical test (Doctor only)
    # Get doctor_id (medical_staff.id) from user_id
    # Try to get medical staff record via API call to medical-staff-service
    doctor_id = None
    
    try:
        # Get authorization token from request
        auth_header = request.headers.get("Authorization", "")
        headers = {"Content-Type": "application/json"}
        if auth_header:
            headers["Authorization"] = auth_header
        
        # Call medical-staff-service to get staff by user_id
        with httpx.Client(timeout=10.0) as client:
            response = client.get(
                f"{settings.API_GATEWAY_URL}/api/v1/medical-staff/by-user/{current_user_id}",
                headers=headers
            )
            
            if response.status_code == 200:
                staff_data = response.json()
                doctor_id = staff_data.get("staff_id")  # Use business identifier
            elif response.status_code == 404:
                # Fallback to direct database query
                staff_result = db.execute(
                    text("SELECT staff_id FROM medical_staff_service.medical_staff WHERE user_id = :user_id"),
                    {"user_id": current_user_id}
                ).first()
                
                if staff_result:
                    doctor_id = staff_result[0]
                else:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Medical staff record not found for this user. Please ensure your medical staff profile is created. Contact an administrator if you need assistance."
                    )
            else:
                # If API call fails, try direct database query as fallback
                staff_result = db.execute(
                    text("SELECT staff_id FROM medical_staff_service.medical_staff WHERE user_id = :user_id"),
                    {"user_id": current_user_id}
                ).first()
                
                if staff_result:
                    doctor_id = staff_result[0]
                else:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Medical staff record not found for this user. Please ensure your medical staff profile is created. Contact an administrator if you need assistance."
                    )
    except httpx.RequestError as e:
        # If HTTP call fails, try direct database query as fallback
        staff_result = db.execute(
            text("SELECT staff_id FROM medical_staff_service.medical_staff WHERE user_id = :user_id"),
            {"user_id": current_user_id}
        ).first()
        
        if staff_result:
            doctor_id = staff_result[0]
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Medical staff record not found for this user. Please ensure your medical staff profile is created. Contact an administrator if you need assistance."
            )
    except HTTPException:
        raise
    except Exception as e:
        # Fallback to direct database query
        staff_result = db.execute(
            text("SELECT staff_id FROM medical_staff_service.medical_staff WHERE user_id = :user_id"),
            {"user_id": current_user_id}
        ).first()
        
        if staff_result:
            doctor_id = staff_result[0]
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error retrieving medical staff record: {str(e)}"
            )
    
    if not doctor_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medical staff record not found for this user. Please ensure your medical staff profile is created. Contact an administrator if you need assistance."
        )
    
    return create_medical_test(db, medical_test, doctor_id)

@router.get("", response_model=List[MedicalTestResponse])
def get_all_medical_tests_endpoint(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    # Get all medical tests (Radiologist, Doctor, and Admin)
    from app.core.dependencies import get_token_from_request
    from app.core.security import decode_access_token
    
    # Check authentication - allow admin users (who may not have sub in token)
    token = get_token_from_request(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    is_active = payload.get("is_active", True)
    if not is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive. Please contact administrator."
        )
    
    # Check role - allow admin, radiologist, and doctor
    user_role = payload.get("role")
    user_role_normalized = str(user_role).lower() if user_role else None
    allowed_roles = ["admin", "radiologist", "doctor"]
    
    if user_role_normalized not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Not enough permissions. Required roles: {allowed_roles}, User role: {user_role}"
        )
    
    # Admin users can access all tests (may not have sub)
    if user_role_normalized == "admin":
        return get_all_medical_tests(db, skip, limit)
    
    # Regular users (radiologist, doctor) must have a user_id
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    
    return get_all_medical_tests(db, skip, limit)

@router.get("/{medical_test_id}", response_model=MedicalTestResponse)
def get_medical_test_endpoint(
    medical_test_id: str,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_role("radiologist", "doctor", "cashier"))
):
    # Get medical test by business identifier (Radiologist, Doctor, Cashier)
    # Cashiers need access to view test details when creating bills from reports
    return get_medical_test(db, medical_test_id)

@router.get("/patient/{patient_id}", response_model=List[MedicalTestResponse])
def get_patient_medical_tests(
    patient_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    # Get all medical tests for a patient by business identifier
    return get_medical_tests_by_patient(db, patient_id, skip, limit)

@router.put("/{medical_test_id}", response_model=MedicalTestResponse)
def update_medical_test_endpoint(
    medical_test_id: str,
    medical_test_update: MedicalTestUpdate,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_role("radiologist"))
):
    # Update medical test (Radiologist only) by business identifier
    return update_medical_test(db, medical_test_id, medical_test_update)

