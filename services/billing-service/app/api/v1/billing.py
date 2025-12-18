from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from typing import List
import httpx
from sqlalchemy import text
from app.core.database import get_db
from app.core.dependencies import get_current_user_id, require_role
from app.core.config import settings
from app.core.security import decode_access_token
from app.schemas.billing import BillCreate, BillUpdate, BillResponse, PaymentCreate, PaymentResponse

security = HTTPBearer()
from app.services.billing_service import (
    create_bill,
    get_bill,
    get_bills_by_patient,
    create_payment,
    get_payments_by_bill,
    get_financial_summary,
    calculate_total_cost_for_patient
)

router = APIRouter()

@router.post("/bills", response_model=BillResponse, status_code=status.HTTP_201_CREATED)
def create_bill_endpoint(
    bill: BillCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_role("admin", "cashier"))
):
    # Create a new bill (Admin and Cashier only)
    new_bill = create_bill(db, bill)
    
    # Log bill creation action
    from app.services.workflow_logger import log_workflow_action_async
    background_tasks.add_task(
        log_workflow_action_async,
        current_user_id,
        "Create Bill",
        "BILL",
        new_bill.bill_id
    )
    
    return new_bill

@router.put("/bills/{bill_id}", response_model=BillResponse)
def update_bill_endpoint(
    bill_id: str,
    bill_update: BillUpdate,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_role("cashier"))
):
    # Update bill (Cashier only) - can add/update procedure_info and update payment status
    from app.models.billing import Bill
    from app.services.billing_service import get_bill
    
    bill = get_bill(db, bill_id)
    update_data = bill_update.dict(exclude_unset=True)
    
    # Update procedure_info if provided
    if "procedure_info" in update_data and update_data["procedure_info"]:
        # Handle both dict and ProcedureInfo objects
        procedure_info_json = []
        for p in update_data["procedure_info"]:
            if isinstance(p, dict):
                # Already a dictionary (from frontend or Pydantic serialization)
                procedure_info_json.append({
                    "procedure": p.get("procedure", ""),
                    "base_cost": float(p.get("base_cost", 0))
                })
            else:
                # ProcedureInfo Pydantic model
                procedure_info_json.append({
                    "procedure": p.procedure,
                    "base_cost": float(p.base_cost)
                })
        bill.procedure_info = procedure_info_json
    
    # Update other fields
    if "total_amount" in update_data:
        bill.total_amount = update_data["total_amount"]
    if "status" in update_data:
        bill.status = update_data["status"]
    if "due_date" in update_data:
        bill.due_date = update_data["due_date"]
    
    db.commit()
    db.refresh(bill)
    return bill

@router.get("/bills", response_model=List[BillResponse])
def get_all_bills(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_role("admin", "cashier"))
):
    # Get all bills (Admin and Cashier only)
    from app.models.billing import Bill
    from app.services.billing_service import update_bill_status_if_overdue
    bills = db.query(Bill).offset(skip).limit(limit).all()
    # Check and update status for each bill if overdue
    updated_bills = []
    for bill in bills:
        updated_bill = update_bill_status_if_overdue(db, bill)
        updated_bills.append(updated_bill)
    return updated_bills

@router.get("/bills/{bill_id}", response_model=BillResponse)
def get_bill_endpoint(
    bill_id: str,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    # Get bill by business identifier
    return get_bill(db, bill_id)

@router.get("/bills/patient/{patient_id}", response_model=List[BillResponse])
def get_patient_bills(
    patient_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    # Get all bills for a patient by business identifier
    return get_bills_by_patient(db, patient_id, skip, limit)

@router.post("/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment_endpoint(
    payment: PaymentCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_role("cashier", "patient"))
):
    # Create a payment (Cashier can process payments, Patients can pay their own bills)
    # Get user role from JWT token to determine if cashier
    user_role = None
    try:
        token = credentials.credentials
        payload = decode_access_token(token)
        if payload:
            user_role = payload.get("role")
    except Exception:
        pass
    
    # If user is a cashier, fetch their medical staff ID
    cashier_id = None
    if user_role == "cashier":
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
                    cashier_id = staff_data.get("staff_id")  # Use business identifier
                elif response.status_code == 404:
                    # Fallback to direct database query
                    staff_result = db.execute(
                        text("SELECT staff_id FROM medical_staff_service.medical_staff WHERE user_id = :user_id"),
                        {"user_id": current_user_id}
                    ).first()
                    
                    if staff_result:
                        cashier_id = staff_result[0]
        except Exception as e:
            # If we can't get cashier_id, log but don't fail (payment can still be created)
            print(f"Warning: Could not fetch cashier staff_id: {e}")
    
    # Set cashier_id in payment if it's a cashier payment
    if cashier_id:
        payment.cashier_id = cashier_id
    
    new_payment = create_payment(db, payment)
    
    # Log payment creation action
    from app.services.workflow_logger import log_workflow_action_async
    background_tasks.add_task(
        log_workflow_action_async,
        current_user_id,
        "Create Payment",
        "BILL",  # Payment is related to a bill
        new_payment.bill_id
    )
    
    return new_payment

@router.put("/bills/{bill_id}/status", response_model=BillResponse)
def update_bill_status_endpoint(
    bill_id: str,
    status: str,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_role("cashier"))
):
    # Update bill payment status (Cashier only)
    from app.models.billing import Bill, BillStatus
    from app.services.billing_service import get_bill
    
    bill = get_bill(db, bill_id)
    bill.status = BillStatus(status)
    db.commit()
    db.refresh(bill)
    return bill

@router.get("/payments/bill/{bill_id}", response_model=List[PaymentResponse])
def get_bill_payments(
    bill_id: str,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    # Get all payments for a bill by business identifier
    return get_payments_by_bill(db, bill_id)

@router.get("/summary/patient/{patient_id}")
def get_patient_financial_summary(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    # Get financial summary for a patient by business identifier
    return get_financial_summary(db, patient_id)

@router.get("/calculate-cost/patient/{patient_id}")
def calculate_patient_cost(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_role("admin", "cashier"))
):
    # Calculate total cost for patient diagnosis by business identifier
    total_cost = calculate_total_cost_for_patient(db, patient_id)
    return {"patient_id": patient_id, "total_cost": float(total_cost)}

@router.get("/dashboard")
def get_billing_dashboard(
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_role("admin"))
):
    # Get billing dashboard with paid and payable amounts (Admin only)
    from app.models.billing import Bill, BillStatus
    from sqlalchemy import func
    
    total_bills = db.query(func.count(Bill.bill_id)).scalar() or 0
    paid_bills = db.query(func.count(Bill.bill_id)).filter(Bill.status == BillStatus.PAID).scalar() or 0
    pending_bills = db.query(func.count(Bill.bill_id)).filter(Bill.status == BillStatus.PENDING).scalar() or 0
    
    total_amount = db.query(func.sum(Bill.total_amount)).scalar() or 0
    paid_amount = db.query(func.sum(Bill.total_amount)).filter(Bill.status == BillStatus.PAID).scalar() or 0
    payable_amount = total_amount - paid_amount
    
    return {
        "total_bills": total_bills,
        "paid_bills": paid_bills,
        "pending_bills": pending_bills,
        "total_amount": float(total_amount),
        "paid_amount": float(paid_amount),
        "payable_amount": float(payable_amount)
    }

