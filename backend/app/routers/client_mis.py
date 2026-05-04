from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import require_client
from app.models import Client, MisRequest, User
from app.schemas.mis import MisCreate, MisOut
from app.services.email_stub import send_admin_new_mis

router = APIRouter(prefix="/api/client/mis-requests", tags=["client-mis"])


def _client_row(user: User, db: Session) -> Client:
    c = db.query(Client).filter(Client.user_id == user.id).first()
    if not c:
        raise HTTPException(status_code=400, detail="Client profile missing")
    return c


@router.get("", response_model=list[MisOut])
def list_mis(db: Session = Depends(get_db), user: User = Depends(require_client)) -> list[MisOut]:
    c = _client_row(user, db)
    rows = db.query(MisRequest).filter(MisRequest.client_id == c.id).order_by(MisRequest.id.desc()).all()
    return [MisOut.model_validate(r) for r in rows]


@router.post("", response_model=MisOut, status_code=status.HTTP_201_CREATED)
def create_mis(body: MisCreate, db: Session = Depends(get_db), user: User = Depends(require_client)) -> MisOut:
    c = _client_row(user, db)
    row = MisRequest(
        client_id=c.id,
        title=body.title,
        duty_start_date=body.duty_start_date,
        trip_end_date=body.trip_end_date,
        trip_type=body.trip_type,
        vehicle_type=body.vehicle_type,
        reporting_time_place=body.reporting_time_place,
        destination_drop=body.destination_drop,
        passenger_name=body.passenger_name,
        passenger_email=str(body.passenger_email) if body.passenger_email else None,
        reporting_at=body.reporting_at,
        status="pending",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    summary = f"{body.title} | {body.duty_start_date} – {body.trip_end_date} | client {c.company_name}"
    send_admin_new_mis(settings.admin_email, row.id, summary)
    return MisOut.model_validate(row)
