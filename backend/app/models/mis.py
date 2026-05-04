from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class MisRequest(Base):
    __tablename__ = "mis_requests"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    duty_start_date: Mapped[date] = mapped_column(Date, nullable=False)
    trip_end_date: Mapped[date] = mapped_column(Date, nullable=False)
    trip_type: Mapped[str] = mapped_column(String(64), nullable=False)
    vehicle_type: Mapped[str] = mapped_column(String(64), nullable=False)
    reporting_time_place: Mapped[str] = mapped_column(String(512), nullable=False)
    destination_drop: Mapped[str] = mapped_column(String(512), nullable=False)
    passenger_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    passenger_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reporting_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(
        Enum("pending", "assigned", "completed", "cancelled", name="mis_status"),
        default="pending",
    )
    assigned_vehicle: Mapped[str | None] = mapped_column(String(255), nullable=True)
    assigned_driver: Mapped[str | None] = mapped_column(String(255), nullable=True)
    assigned_driver_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    passenger_details_sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
