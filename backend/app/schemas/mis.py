from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class MisCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    duty_start_date: date
    trip_end_date: date
    trip_type: str = Field(max_length=64)
    vehicle_type: str = Field(max_length=64)
    reporting_time_place: str = Field(max_length=512)
    destination_drop: str = Field(max_length=512)
    passenger_name: str | None = Field(default=None, max_length=255)
    passenger_email: EmailStr | None = None
    reporting_at: datetime | None = None


class MisAssign(BaseModel):
    assigned_vehicle: str = Field(min_length=1, max_length=255)
    assigned_driver: str = Field(min_length=1, max_length=255)
    assigned_driver_phone: str | None = Field(default=None, max_length=32)


class MisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int
    title: str
    duty_start_date: date
    trip_end_date: date
    trip_type: str
    vehicle_type: str
    reporting_time_place: str
    destination_drop: str
    passenger_name: str | None
    passenger_email: str | None
    reporting_at: datetime | None
    status: str
    assigned_vehicle: str | None
    assigned_driver: str | None
    assigned_driver_phone: str | None
    created_at: datetime
