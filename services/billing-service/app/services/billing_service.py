from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.billing import Bill, Payment, BillStatus, PaymentMethod
from app.schemas.billing import BillCreate, PaymentCreate
from datetime import datetime, timedelta, timezone
from decimal import Decimal

def generate_bill_id(db: Session) -> str:
    # Generate unique bill ID string (e.g., "BILL-000001")
    last_bill = db.query(Bill).filter(Bill.bill_id.like('BILL-%')).order_by(Bill.bill_id.desc()).first()
    
    if last_bill:
        # Extract the number from the last bill_id and increment
        try:
            # Extract number from BILL-000001 format
            last_num = int(last_bill.bill_id.split('-')[-1])
            sequential_num = last_num + 1
        except (ValueError, IndexError):
            sequential_num = 1
    else:
        sequential_num = 1
    
    # Format: BILL-000001 (6-digit number)
    bill_id = f"BILL-{sequential_num:06d}"
    
    # Ensure uniqueness (in case of race conditions)
    while db.query(Bill).filter(Bill.bill_id == bill_id).first():
        sequential_num += 1
        bill_id = f"BILL-{sequential_num:06d}"
    
    return bill_id

def generate_payment_id(db: Session) -> str:
    # Generate unique payment ID string (e.g., "PAY-000001")
    last_payment = db.query(Payment).filter(Payment.payment_id.like('PAY-%')).order_by(Payment.payment_id.desc()).first()
    
    if last_payment:
        try:
            # Extract number from PAY-000001 format
            last_num = int(last_payment.payment_id.split('-')[-1])
            sequential_num = last_num + 1
        except (ValueError, IndexError):
            sequential_num = 1
    else:
        sequential_num = 1
    
    payment_id = f"PAY-{sequential_num:06d}"
    
    # Ensure uniqueness
    while db.query(Payment).filter(Payment.payment_id == payment_id).first():
        sequential_num += 1
        payment_id = f"PAY-{sequential_num:06d}"
    
    return payment_id

def create_bill(db: Session, bill: BillCreate) -> Bill:
    # Create a new bill
    bill_id = generate_bill_id(db)
    
    due_date = bill.due_date
    if not due_date:
        due_date = datetime.now(timezone.utc) + timedelta(days=30)
    
    # Determine initial status - if due_date is in the past, set to OVERDUE
    now = datetime.now(timezone.utc)
    if due_date.tzinfo is None:
        due_date = due_date.replace(tzinfo=timezone.utc)
    
    initial_status = BillStatus.PENDING
    if now > due_date:
        initial_status = BillStatus.OVERDUE
    
    # Convert procedure_info to JSON format
    procedure_info_json = None
    if bill.procedure_info:
        procedure_info_json = [
            {"procedure": p.procedure, "base_cost": float(p.base_cost)}
            for p in bill.procedure_info
        ]
    
    db_bill = Bill(
        bill_id=bill_id,
        patient_id=bill.patient_id,
        procedure_info=procedure_info_json,
        total_amount=bill.total_amount,
        due_date=due_date,
        status=initial_status
    )
    db.add(db_bill)
    db.commit()
    db.refresh(db_bill)
    return db_bill

def update_bill_status_if_overdue(db: Session, bill: Bill) -> Bill:
    # Check if bill is overdue and update status if needed
    if bill.status != BillStatus.PAID and bill.status != BillStatus.CANCELLED:
        if bill.due_date:
            # Compare timezone-aware datetimes
            now = datetime.now(timezone.utc)
            # If due_date is timezone-naive, assume UTC
            due_date = bill.due_date
            if due_date.tzinfo is None:
                due_date = due_date.replace(tzinfo=timezone.utc)
            
            if now > due_date:
                if bill.status != BillStatus.OVERDUE:
                    bill.status = BillStatus.OVERDUE
                    db.commit()
                    db.refresh(bill)
    return bill

def get_bill(db: Session, bill_id: str) -> Bill:
    # Get bill by business identifier
    bill = db.query(Bill).filter(Bill.bill_id == bill_id).first()
    if not bill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bill not found"
        )
    # Check and update status if overdue
    bill = update_bill_status_if_overdue(db, bill)
    return bill

def get_bills_by_patient(db: Session, patient_id: str, skip: int = 0, limit: int = 100):
    # Get all bills for a patient by business identifier
    bills = db.query(Bill).filter(
        Bill.patient_id == patient_id
    ).offset(skip).limit(limit).all()
    # Check and update status for each bill if overdue
    updated_bills = []
    for bill in bills:
        updated_bill = update_bill_status_if_overdue(db, bill)
        updated_bills.append(updated_bill)
    return updated_bills

def create_payment(db: Session, payment: PaymentCreate) -> Payment:
    # Create a new payment
    bill = get_bill(db, payment.bill_id)
    
    # Query payments for this bill separately
    payments = db.query(Payment).filter(Payment.bill_id == payment.bill_id).all()
    total_paid = sum(float(p.amount) for p in payments)
    
    if total_paid + float(payment.amount) > float(bill.total_amount):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment amount exceeds bill total"
        )
    
    payment_id = generate_payment_id(db)
    db_payment = Payment(
        payment_id=payment_id,
        bill_id=payment.bill_id,
        amount=payment.amount,
        payment_method=payment.payment_method,
        transaction_reference=payment.transaction_reference,
        cashier_id=payment.cashier_id  # Medical staff ID of cashier who processed the payment
    )
    db.add(db_payment)
    
    total_paid_after = total_paid + float(payment.amount)
    if total_paid_after >= float(bill.total_amount):
        bill.status = BillStatus.PAID
        # Update related reports to "paid" status
        # Find all reports with status "billed" for this patient and update them to "paid"
        try:
            from sqlalchemy import text
            # Direct database update since all services share the same database
            db.execute(
                text("""
                    UPDATE diagnostic_report_service.diagnostic_reports 
                    SET status = 'paid', updated_at = CURRENT_TIMESTAMP
                    WHERE patient_id = :patient_id 
                    AND status = 'billed'
                """),
                {"patient_id": bill.patient_id}
            )
        except Exception as e:
            # Log error but don't fail payment
            print(f"Warning: Could not update reports to paid status: {e}")
    else:
        # Check if overdue after payment
        bill = update_bill_status_if_overdue(db, bill)
    
    db.commit()
    db.refresh(db_payment)
    return db_payment

def get_payments_by_bill(db: Session, bill_id: str):
    # Get all payments for a bill by business identifier
    return db.query(Payment).filter(Payment.bill_id == bill_id).all()

def get_financial_summary(db: Session, patient_id: str) -> dict:
    # Get financial summary for a patient by business identifier
    bills = get_bills_by_patient(db, patient_id)
    total_billed = sum(float(bill.total_amount) for bill in bills)
    
    # Query payments for all bills separately
    total_paid = Decimal("0.00")
    for bill in bills:
        payments = db.query(Payment).filter(Payment.bill_id == bill.bill_id).all()
        total_paid += sum(Decimal(str(p.amount)) for p in payments)
    
    pending = Decimal(str(total_billed)) - total_paid
    
    return {
        "patient_id": patient_id,
        "total_billed": float(total_billed),
        "total_paid": float(total_paid),
        "pending": float(pending),
        "bills_count": len(bills)
    }

def calculate_total_cost_for_patient(db: Session, patient_id: str) -> Decimal:
    # Calculate total cost for all finalized reports of a patient by business identifier
    # Note: In SOA, this would call diagnostic-report-service via API
    # For now, we'll return 0 or implement a local calculation if needed
    return Decimal("0.00")

