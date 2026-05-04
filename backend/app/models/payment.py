from datetime import datetime
from decimal import Decimal

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PaymentBatch(Base):
    __tablename__ = "payment_batches"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    period_label: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="parsed")
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    lines: Mapped[list["PaymentLine"]] = relationship("PaymentLine", back_populates="batch")


class PaymentLine(Base):
    __tablename__ = "payment_lines"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    batch_id: Mapped[int] = mapped_column(ForeignKey("payment_batches.id", ondelete="CASCADE"), index=True)
    vehicle_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    driver_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    driver_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    trip_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fuel_advance: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    emi: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    other_advance: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    net_payable: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    raw_row: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    public_token: Mapped[str] = mapped_column(String(36), unique=True, nullable=False)
    whatsapp_sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    batch: Mapped["PaymentBatch"] = relationship("PaymentBatch", back_populates="lines")


class PaymentQuery(Base):
    __tablename__ = "payment_queries"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    line_id: Mapped[int] = mapped_column(ForeignKey("payment_lines.id", ondelete="CASCADE"), index=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
