from fastapi import APIRouter, Depends, status, BackgroundTasks  # FastAPI components for routing, dependencies, status codes, and background tasks
from sqlalchemy.orm import Session  # SQLAlchemy session for database operations
from typing import List  # Type hinting for list types
from app.core.database import get_db  # Database session dependency
from app.core.dependencies import get_current_user_id, require_role  # Authentication and authorization dependencies
from app.schemas.diagnostic_report import DiagnosticReportCreate, DiagnosticReportUpdate, DiagnosticReportResponse  # Pydantic schemas for request/response validation
from app.services.diagnostic_report_service import (
    create_diagnostic_report,
    get_diagnostic_report,
    get_reports_by_patient,
    get_reports_by_image,
    update_diagnostic_report,
    finalize_report,
    delete_diagnostic_report
)  # Business logic functions for diagnostic reports
from app.services.workflow_logger import log_workflow_action_async  # Async workflow logging service

router = APIRouter()

@router.post("", response_model=DiagnosticReportResponse, status_code=status.HTTP_201_CREATED)  # Create new diagnostic report
def create_report(
    report: DiagnosticReportCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_role("radiologist", "doctor"))
):
    from sqlalchemy import text
    staff_result = db.execute(
        text("SELECT staff_id FROM medical_staff_service.medical_staff WHERE user_id = :user_id"),
        {"user_id": current_user_id}
    ).first()
    doctor_id = staff_result[0] if staff_result else report.radiologist_id
    new_report = create_diagnostic_report(db, report, doctor_id=doctor_id)
    
    background_tasks.add_task(
        log_workflow_action_async,
        current_user_id,
        "Create Report",
        "REPORT",
        new_report.report_id
    )
    
    return new_report

@router.get("", response_model=List[DiagnosticReportResponse])  # Get all diagnostic reports with pagination
def get_all_reports(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_role("admin", "doctor", "radiologist", "cashier"))
):
    from app.models.diagnostic_report import DiagnosticReport
    return db.query(DiagnosticReport).offset(skip).limit(limit).all()

@router.get("/{report_id}", response_model=DiagnosticReportResponse)  # Get diagnostic report by ID
def get_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    return get_diagnostic_report(db, report_id)

@router.get("/patient/{patient_id}", response_model=List[DiagnosticReportResponse])  # Get all reports for a specific patient
def get_patient_reports(
    patient_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    return get_reports_by_patient(db, patient_id, skip, limit)

@router.get("/image/{image_id}", response_model=List[DiagnosticReportResponse])  # Get all reports for a specific medical image
def get_image_reports(
    image_id: str,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_role("radiologist", "doctor"))
):
    return get_reports_by_image(db, image_id)

@router.put("/{report_id}", response_model=DiagnosticReportResponse)  # Update existing diagnostic report
def update_report(
    report_id: str,
    report_update: DiagnosticReportUpdate,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_role("radiologist", "doctor", "cashier"))
):
    return update_diagnostic_report(db, report_id, report_update)

@router.post("/{report_id}/finalize", response_model=DiagnosticReportResponse)  # Finalize diagnostic report (change status to confirmed)
def finalize_report_endpoint(
    report_id: str,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_role("radiologist", "doctor"))
):
    return finalize_report(db, report_id)

@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)  # Delete diagnostic report by ID
def delete_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_role("admin"))
):
    delete_diagnostic_report(db, report_id)
    return None

