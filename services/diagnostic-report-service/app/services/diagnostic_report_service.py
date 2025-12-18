from sqlalchemy.orm import Session  # Database session for queries
from fastapi import HTTPException, status  # HTTP exception handling
from app.models.diagnostic_report import DiagnosticReport, ReportStatus  # Diagnostic report model and status enum
from app.schemas.diagnostic_report import DiagnosticReportCreate, DiagnosticReportUpdate  # Request schemas
from app.core.config import settings  # Application configuration
from datetime import datetime  # DateTime for timestamps
from sqlalchemy import text  # Raw SQL text execution

def generate_report_id(db: Session) -> str:
    last_report = db.query(DiagnosticReport).filter(DiagnosticReport.report_id.like('RPT-%')).order_by(DiagnosticReport.report_id.desc()).first()
    
    if last_report:
        try:
            last_num = int(last_report.report_id.split('-')[-1])
            sequential_num = last_num + 1
        except (ValueError, IndexError):
            sequential_num = 1
    else:
        sequential_num = 1
    
    report_id = f"RPT-{sequential_num:06d}"
    
    while db.query(DiagnosticReport).filter(DiagnosticReport.report_id == report_id).first():
        sequential_num += 1
        report_id = f"RPT-{sequential_num:06d}"
    
    return report_id


def update_medical_test_status(db: Session, medical_test_id: str, new_status: str):
    try:
        status_map = {
            "requested": "requested",
            "completed": "completed",
            "reporting": "reporting",
            "cancelled": "cancelled"
        }
        
        status_value = status_map.get(new_status.lower(), new_status.lower())
        
        db.execute(
            text("""
                UPDATE medical_test_service.medical_tests 
                SET status = :status, updated_at = NOW()
                WHERE medical_test_id = :medical_test_id
            """),
            {"status": status_value, "medical_test_id": medical_test_id}
        )
        db.commit()
    except Exception as e:
        print(f"Error updating medical test status: {e}")
        import traceback
        print(traceback.format_exc())
        db.rollback()

def create_diagnostic_report(db: Session, report: DiagnosticReportCreate, doctor_id: str = None) -> DiagnosticReport:
    report_id = generate_report_id(db)
    
    medical_test_id = getattr(report, 'medical_test_id', None)
    if not medical_test_id:
        try:
            result = db.execute(
                text("SELECT medical_test_id FROM medical_image_service.medical_images WHERE image_id = :image_id"),
                {"image_id": report.image_id}
            ).first()
            if result and result[0]:
                medical_test_id = result[0]
        except Exception as e:
            print(f"Error getting medical_test_id from image: {e}")
    
    if doctor_id is None:
        doctor_id = report.radiologist_id
    
    db_report = DiagnosticReport(
        report_id=report_id,
        patient_id=report.patient_id,
        image_id=report.image_id,
        doctor_id=doctor_id,
        radiologist_id=report.radiologist_id,
        medical_test_id=medical_test_id,
        status=report.status,
        findings=report.findings,
        diagnosis=report.diagnosis,
        recommendations=report.recommendations,
        updated_date=datetime.utcnow().date()
    )
    
    if report.status == ReportStatus.CONFIRMED:
        db_report.finalized_at = datetime.utcnow()
    
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    
    if medical_test_id:
        update_medical_test_status(db, medical_test_id, "reporting")
    
    return db_report

def get_diagnostic_report(db: Session, report_id: str) -> DiagnosticReport:
    report = db.query(DiagnosticReport).filter(DiagnosticReport.report_id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diagnostic report not found"
        )
    return report

def get_reports_by_patient(db: Session, patient_id: str, skip: int = 0, limit: int = 100):
    return db.query(DiagnosticReport).filter(
        DiagnosticReport.patient_id == patient_id
    ).offset(skip).limit(limit).all()

def get_reports_by_image(db: Session, image_id: str):
    return db.query(DiagnosticReport).filter(
        DiagnosticReport.image_id == image_id
    ).all()

def update_diagnostic_report(
    db: Session,
    report_id: str,
    report_update: DiagnosticReportUpdate
) -> DiagnosticReport:
    report = get_diagnostic_report(db, report_id)
    update_data = report_update.dict(exclude_unset=True)
    
    new_status = update_data.get("status")
    
    status_changed_to_confirmed = False
    if "status" in update_data and update_data["status"] == ReportStatus.CONFIRMED:
        report.finalized_at = datetime.utcnow()
        status_changed_to_confirmed = True
    
    for field, value in update_data.items():
        if field != "status" or value != ReportStatus.CONFIRMED:
            setattr(report, field, value)
    
    report.updated_at = datetime.utcnow()
    
    if new_status and report.medical_test_id:
        if new_status == ReportStatus.CONFIRMED or new_status == ReportStatus.BILLED:
            update_medical_test_status(db, report.medical_test_id, "reporting")
        elif new_status == ReportStatus.CANCELLED:
            update_medical_test_status(db, report.medical_test_id, "completed")
    
    if status_changed_to_confirmed and report.diagnosis:
        try:
            from app.core.database import engine
            from sqlalchemy import text
            with engine.connect() as conn:
                result = conn.execute(
                    text("SELECT conditions FROM patient_service.patients WHERE id = :patient_id"),
                    {"patient_id": report.patient_id}
                ).first()
                if result:
                    current_conditions = result[0] or []
                    if report.diagnosis not in current_conditions:
                        current_conditions.append(report.diagnosis)
                        conn.execute(
                            text("UPDATE patient_service.patients SET conditions = :conditions WHERE id = :patient_id"),
                            {"conditions": current_conditions, "patient_id": report.patient_id}
                        )
                        conn.commit()
        except Exception as e:
            print(f"Error updating patient conditions: {e}")
    
    db.commit()
    db.refresh(report)
    return report

def finalize_report(db: Session, report_id: str) -> DiagnosticReport:
    report = get_diagnostic_report(db, report_id)
    report.status = ReportStatus.CONFIRMED
    report.finalized_at = datetime.utcnow()
    report.updated_at = datetime.utcnow()
    
    if report.medical_test_id:
        update_medical_test_status(db, report.medical_test_id, "reporting")
    
    if report.diagnosis:
        try:
            from app.core.database import engine
            from sqlalchemy import text
            with engine.connect() as conn:
                result = conn.execute(
                    text("SELECT conditions FROM patient_service.patients WHERE patient_id = :patient_id"),
                    {"patient_id": report.patient_id}
                ).first()
                if result:
                    current_conditions = result[0] or []
                    if report.diagnosis not in current_conditions:
                        current_conditions.append(report.diagnosis)
                        conn.execute(
                            text("UPDATE patient_service.patients SET conditions = :conditions WHERE patient_id = :patient_id"),
                            {"conditions": current_conditions, "patient_id": report.patient_id}
                        )
                        conn.commit()
        except Exception as e:
            print(f"Error updating patient conditions: {e}")
    
    db.commit()
    db.refresh(report)
    return report

def delete_diagnostic_report(db: Session, report_id: str) -> None:
    report = get_diagnostic_report(db, report_id)
    db.delete(report)
    db.commit()

