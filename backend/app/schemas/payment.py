from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class PaymentLinePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    vehicle_number: str | None
    driver_name: str | None
    trip_count: int | None
    fuel_advance: Decimal | None
    emi: Decimal | None
    other_advance: Decimal | None
    net_payable: Decimal | None
    period_label: str | None = None


class PaymentQueryCreate(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


class BatchSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    original_filename: str
    period_label: str | None
    status: str
    row_count: int
    created_at: datetime


class PaymentLineAdmin(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vehicle_number: str | None
    driver_name: str | None
    driver_phone: str | None
    trip_count: int | None
    fuel_advance: Decimal | None
    emi: Decimal | None
    other_advance: Decimal | None
    net_payable: Decimal | None
    public_token: str
    whatsapp_sent_at: datetime | None
