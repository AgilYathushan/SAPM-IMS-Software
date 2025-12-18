from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status, UploadFile
from app.models.medical_image import MedicalImage, ImageStatus, ImageType
from app.schemas.medical_image import MedicalImageCreate
from app.core.minio_client import get_minio_client
from app.core.config import settings
from datetime import datetime
from io import BytesIO
import time

def generate_image_id(db: Session) -> str:
    """Generate unique image ID string (e.g., "IMG-000001")"""
    last_image = db.query(MedicalImage).filter(MedicalImage.image_id.like('IMG-%')).order_by(MedicalImage.image_id.desc()).first()
    
    if last_image:
        try:
            # Extract number from IMG-000001 format
            last_num = int(last_image.image_id.split('-')[-1])
            sequential_num = last_num + 1
        except (ValueError, IndexError):
            sequential_num = 1
    else:
        sequential_num = 1
    
    image_id = f"IMG-{sequential_num:06d}"
    
    # Ensure uniqueness
    while db.query(MedicalImage).filter(MedicalImage.image_id == image_id).first():
        sequential_num += 1
        image_id = f"IMG-{sequential_num:06d}"
    
    return image_id

def upload_image_to_minio(file: UploadFile, image_id: str) -> str:
    """Upload image to MinIO and return URL"""
    minio_client = get_minio_client()
    
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
    object_name = f"{image_id}.{file_extension}"
    
    file_content = file.file.read()
    file_size = len(file_content)
    
    minio_client.put_object(
        settings.MINIO_BUCKET_NAME,
        object_name,
        BytesIO(file_content),
        length=file_size,
        content_type=file.content_type or "application/octet-stream"
    )
    
    # Generate URL accessible from frontend (use localhost instead of internal Docker hostname)
    # If MINIO_ENDPOINT is internal (minio:9000), convert to localhost:9000 for frontend access
    endpoint = settings.MINIO_ENDPOINT
    if 'minio:' in endpoint:
        # Replace internal Docker hostname with localhost for frontend access
        endpoint = endpoint.replace('minio:', 'localhost:')
    elif not endpoint.startswith('http'):
        # If it's just a hostname without protocol, add http://
        if 'localhost' not in endpoint and '127.0.0.1' not in endpoint:
            # Internal hostname, convert to localhost
            if ':' in endpoint:
                port = endpoint.split(':')[-1]
                endpoint = f"localhost:{port}"
            else:
                endpoint = f"localhost:9000"
        endpoint = f"http://{endpoint}"
    
    if not endpoint.startswith('http'):
        endpoint = f"http://{endpoint}"
    
    image_url = f"{endpoint}/{settings.MINIO_BUCKET_NAME}/{object_name}"
    return image_url

def create_medical_image(
    db: Session,
    image: MedicalImageCreate,
    file: UploadFile,
    uploaded_by: str
) -> MedicalImage:
    """Create a new medical image record and upload file"""
    max_retries = 10
    retry_count = 0
    
    file_content = file.file.read()
    file_size = len(file_content)
    file.file.seek(0)
    
    image_url = None
    image_id = None
    
    while retry_count < max_retries:
        try:
            image_id = generate_image_id(db)
            
            # Upload to MinIO first (before DB commit)
            image_url = upload_image_to_minio(file, str(image_id))
            
            db_image = MedicalImage(
                patient_id=image.patient_id,
                image_id=image_id,
                img_url=image_url,
                image_url=image_url,
                image_type=image.image_type,
                file_name=file.filename,
                file_size=image.file_size or file_size,
                uploaded_by=uploaded_by,
                medical_test_id=getattr(image, 'medical_test_id', None),
                description=image.description,
                status=ImageStatus.UPLOADED
            )
            db.add(db_image)
            db.commit()
            db.refresh(db_image)
            return db_image
            
        except IntegrityError as e:
            # Handle duplicate key error (race condition)
            db.rollback()
            # Clean up MinIO object if it was uploaded
            if image_url:
                try:
                    minio_client = get_minio_client()
                    object_name = image_url.split('/')[-1]
                    minio_client.remove_object(settings.MINIO_BUCKET_NAME, object_name)
                except:
                    pass
            
            retry_count += 1
            if retry_count >= max_retries:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to generate unique image ID after multiple retries. Please try again."
                )
            # Small delay before retry to reduce collision probability
            time.sleep(0.1 * retry_count)
            # Reset file pointer for retry
            file.file.seek(0)
            image_url = None
            image_id = None
        except Exception as e:
            db.rollback()
            # Clean up MinIO object if it was uploaded
            if image_url:
                try:
                    minio_client = get_minio_client()
                    object_name = image_url.split('/')[-1]
                    minio_client.remove_object(settings.MINIO_BUCKET_NAME, object_name)
                except:
                    pass
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create medical image: {str(e)}"
            )

def get_medical_image(db: Session, image_id: str) -> MedicalImage:
    """Get medical image by business identifier"""
    image = db.query(MedicalImage).filter(MedicalImage.image_id == image_id).first()
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medical image not found"
        )
    return image

def get_images_by_patient(db: Session, patient_id: str, skip: int = 0, limit: int = 100):
    """Get all images for a patient by business identifier"""
    return db.query(MedicalImage).filter(
        MedicalImage.patient_id == patient_id
    ).offset(skip).limit(limit).all()

def update_image_status(db: Session, image_id: str, status: ImageStatus) -> MedicalImage:
    """Update image status by business identifier"""
    image = get_medical_image(db, image_id)
    image.status = status
    image.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(image)
    return image

def delete_medical_image(db: Session, image_id: str) -> None:
    """Delete medical image and remove from MinIO by business identifier"""
    image = get_medical_image(db, image_id)
    
    try:
        minio_client = get_minio_client()
        object_name = image.image_url.split('/')[-1]
        minio_client.remove_object(settings.MINIO_BUCKET_NAME, object_name)
    except Exception as e:
        print(f"Error deleting from MinIO: {e}")
    
    db.delete(image)
    db.commit()

