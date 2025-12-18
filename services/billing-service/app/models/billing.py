from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, Numeric, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base

class BillStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    CARD = "card"
    BANK_TRANSFER = "bank_transfer"
    INSURANCE = "insurance"

class Bill(Base):
    __tablename__ = "bills"
    __table_args__ = {"schema": "billing_service"}

    bill_id = Column(String(10), primary_key=True, index=True, nullable=False)  # Business identifier: BILL-000001 (Primary Key)
    patient_id = Column(String(10), ForeignKey("patient_service.patients.patient_id", use_alter=True), nullable=False)
    procedure_info = Column(JSON, nullable=True)  # List of {procedure: str, base_cost: float}
    total_amount = Column(Numeric(10, 2), nullable=False)  # Renamed from base_cost
    status = Column(Enum(BillStatus, native_enum=False), default=BillStatus.PENDING)
    due_date = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = {"schema": "billing_service"}

    payment_id = Column(String(10), primary_key=True, index=True, nullable=False)  # Business identifier: PAY-000001 (Primary Key)
    bill_id = Column(String(10), ForeignKey("billing_service.bills.bill_id", use_alter=True), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    payment_method = Column(Enum(PaymentMethod, native_enum=False), nullable=False)
    transaction_reference = Column(String(100))
    cashier_id = Column(String(10), ForeignKey("medical_staff_service.medical_staff.staff_id", use_alter=True), nullable=True)  # Medical staff ID of cashier who processed the payment
    paid_at = Column(DateTime(timezone=True), server_default=func.now())

