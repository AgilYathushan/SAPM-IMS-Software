from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks, Request
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.dependencies import get_current_user_id, require_role
from app.schemas.medical_image import MedicalImageResponse, ImageUploadResponse, MedicalImageCreate, MedicalImageUpdate
from app.services.medical_image_service import (
    create_medical_image,
    get_medical_image,
    get_images_by_patient,
    update_image_status,
    delete_medical_image
)
from app.models.medical_image import ImageType, ImageStatus

router = APIRouter()

@router.post("/upload", response_model=ImageUploadResponse, status_code=status.HTTP_201_CREATED)
def upload_image(
    patient_id: str = Form(...),  # Business identifier: PAT-000001
    image_type: str = Form(...),
    file: UploadFile = File(...),
    description: str = Form(None),
    medical_test_id: str = Form(None),  # Business identifier: TEST-YYYYMMDD-XXX
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_role("radiologist"))
):
    # Upload a medical image (Radiologist only)
    # Get medical staff business identifier from user_id
    from sqlalchemy import text
    staff_result = db.execute(
        text("SELECT staff_id FROM medical_staff_service.medical_staff WHERE user_id = :user_id"),
        {"user_id": current_user_id}
    ).first()
    uploaded_by = staff_result[0] if staff_result else None
    if not uploaded_by:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medical staff record not found for this user"
        )
    
    # Normalize image_type string to enum value
    image_type_str = image_type.lower().strip()
    # Map common variations to enum values
    type_mapping = {
        'ct': 'ct',
        'ct_scan': 'ct',
        'ctscan': 'ct',
        'mri': 'mri',
        'mri_scan': 'mri',
        'mriscan': 'mri',
        'xray': 'xray',
        'x_ray': 'xray',
        'x-ray': 'xray',
        'xrayscan': 'xray',
        'x_ray_scan': 'xray'
    }
    
    normalized_type = type_mapping.get(image_type_str, image_type_str)
    
    try:
        image_type_enum = ImageType(normalized_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid image_type: {image_type}. Must be one of: mri, ct, xray"
        )
    
    image_create = MedicalImageCreate(
        patient_id=patient_id,
        image_type=image_type_enum,
        file_name=file.filename,
        file_size=None,
        description=description,
        medical_test_id=medical_test_id
    )
    
    image = create_medical_image(db, image_create, file, uploaded_by)
    
    # Log image upload action
    from app.services.workflow_logger import log_workflow_action_async
    background_tasks.add_task(
        log_workflow_action_async,
        current_user_id,
        "Upload Medical Image",
        "IMAGE",
        image.image_id
    )
    
    return ImageUploadResponse(
        image_id=image.image_id,
        image_url=image.image_url,
        message="Image uploaded successfully"
    )

@router.get("", response_model=List[MedicalImageResponse])
def get_all_images(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    # Get all images (Authorized users only, including admin)
    from app.models.medical_image import MedicalImage
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
    
    # Allow admin users (who may have sub: None) or regular users
    user_role = payload.get("role")
    user_id = payload.get("sub")
    
    # Admin users can access all images
    if user_role == "admin":
        return db.query(MedicalImage).offset(skip).limit(limit).all()
    
    # Regular users must have a user_id
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    
    return db.query(MedicalImage).offset(skip).limit(limit).all()

@router.get("/{image_id}", response_model=MedicalImageResponse)
def get_image(
    image_id: str,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    # Get image by business identifier
    return get_medical_image(db, image_id)

@router.get("/patient/{patient_id}", response_model=List[MedicalImageResponse])
def get_patient_images(
    patient_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    # Get all images for a patient by business identifier
    return get_images_by_patient(db, patient_id, skip, limit)

@router.patch("/{image_id}/status", response_model=MedicalImageResponse)
def update_image_status_endpoint(
    image_id: str,
    status: ImageStatus,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_role("radiologist"))
):
    # Update image status (Radiologist only) by business identifier
    return update_image_status(db, image_id, status)

@router.delete("/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_image(
    image_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_role("admin", "radiologist"))
):
    # Delete image (Admin and Radiologist) by business identifier
    # Radiologists can delete images they uploaded or images associated with their tests
    
    # Log image deletion action before deleting
    from app.services.workflow_logger import log_workflow_action_async
    background_tasks.add_task(
        log_workflow_action_async,
        current_user_id,
        "Delete Medical Image",
        "IMAGE",
        image_id
    )
    
    delete_medical_image(db, image_id)
    return None

