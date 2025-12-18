from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.medical_test import MedicalTest, MedicalTestStatus
from app.schemas.medical_test import MedicalTestCreate, MedicalTestUpdate
from datetime import datetime

def generate_medical_test_id(db: Session) -> str:
    # Generate unique medical test ID string (e.g., "TEST-000001")
    last_test = db.query(MedicalTest).filter(MedicalTest.medical_test_id.like('TEST-%')).order_by(MedicalTest.medical_test_id.desc()).first()
    
    if last_test:
        try:
            # Extract number from TEST-000001 format
            last_num = int(last_test.medical_test_id.split('-')[-1])
            sequential_num = last_num + 1
        except (ValueError, IndexError):
            sequential_num = 1
    else:
        sequential_num = 1
    
    test_id = f"TEST-{sequential_num:06d}"
    
    # Ensure uniqueness
    while db.query(MedicalTest).filter(MedicalTest.medical_test_id == test_id).first():
        sequential_num += 1
        test_id = f"TEST-{sequential_num:06d}"
    
    return test_id

def create_medical_test(db: Session, medical_test: MedicalTestCreate, doctor_id: str) -> MedicalTest:
    # Create a new medical test
    medical_test_id = generate_medical_test_id(db)
    
    db_test = MedicalTest(
        medical_test_id=medical_test_id,
        patient_id=medical_test.patient_id,
        doctor_id=doctor_id,
        radiologist_id=medical_test.radiologist_id,
        test_type=medical_test.test_type,
        notes=medical_test.notes,
        status=MedicalTestStatus.REQUESTED
    )
    db.add(db_test)
    db.commit()
    db.refresh(db_test)
    return db_test

def get_medical_test(db: Session, medical_test_id: str) -> MedicalTest:
    # Get medical test by business identifier
    test = db.query(MedicalTest).filter(MedicalTest.medical_test_id == medical_test_id).first()
    if not test:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medical test not found"
        )
    return test

def get_all_medical_tests(db: Session, skip: int = 0, limit: int = 100):
    # Get all medical tests
    # First, try to fix any enum value issues in the database
    from sqlalchemy import text
    try:
        # Ensure all status values are lowercase (matching enum definition)
        db.execute(text("""
            UPDATE medical_test_service.medical_tests 
            SET status = LOWER(status::text)
            WHERE status::text != LOWER(status::text)
        """))
        db.commit()
    except Exception as e:
        print(f"Note: Could not normalize enum values (this is okay if table doesn't exist yet): {e}")
        db.rollback()
    
    # Now query normally
    return db.query(MedicalTest).order_by(MedicalTest.requested_at.desc()).offset(skip).limit(limit).all()

def get_medical_tests_by_patient(db: Session, patient_id: str, skip: int = 0, limit: int = 100):
    # Get all medical tests for a patient by business identifier
    return db.query(MedicalTest).filter(
        MedicalTest.patient_id == patient_id
    ).order_by(MedicalTest.requested_at.desc()).offset(skip).limit(limit).all()

def update_medical_test(db: Session, medical_test_id: str, medical_test_update: MedicalTestUpdate) -> MedicalTest:
    # Update medical test by business identifier
    test = get_medical_test(db, medical_test_id)
    update_data = medical_test_update.dict(exclude_unset=True)
    
    if "status" in update_data:
        if update_data["status"] == MedicalTestStatus.COMPLETED and not test.completed_at:
            test.completed_at = datetime.utcnow()
    
    for field, value in update_data.items():
        setattr(test, field, value)
    
    db.commit()
    db.refresh(test)
    return test

