from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List, Dict, Any
from decimal import Decimal
from app.models.billing import BillStatus, PaymentMethod

class ProcedureInfo(BaseModel):
    procedure: str  # Derived from image type (e.g., "CT Scan", "XRAY", "MRI")
    base_cost: Decimal

class BillBase(BaseModel):
    total_amount: Decimal
    due_date: Optional[datetime] = None

class BillCreate(BillBase):
    patient_id: str  # Business identifier: PAT-000001
    procedure_info: Optional[List[ProcedureInfo]] = None  # List of procedures with costs

class BillUpdate(BaseModel):
    total_amount: Optional[Decimal] = None
    procedure_info: Optional[List[ProcedureInfo]] = None
    status: Optional[BillStatus] = None
    due_date: Optional[datetime] = None

class BillResponse(BillBase):
    model_config = ConfigDict(from_attributes=True)
    
    bill_id: str
    patient_id: str  # Business identifier: PAT-000001
    procedure_info: Optional[List[Dict[str, Any]]] = None  # List of {procedure: str, base_cost: float}
    status: BillStatus
    created_at: datetime
    updated_at: Optional[datetime] = None

class PaymentCreate(BaseModel):
    bill_id: str  # Business identifier: BILL-YYYYMMDD-XXX
    amount: Decimal
    payment_method: PaymentMethod
    transaction_reference: Optional[str] = None
    cashier_id: Optional[str] = None  # Medical staff ID of cashier who processed the payment (optional, only for cashier payments)

class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    payment_id: str
    bill_id: str  # Business identifier: BILL-YYYYMMDD-XXX
    amount: Decimal
    payment_method: PaymentMethod
    transaction_reference: Optional[str] = None
    cashier_id: Optional[str] = None  # Medical staff ID of cashier who processed the payment
    paid_at: datetime

