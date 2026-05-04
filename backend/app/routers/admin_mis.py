from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import require_admin
from app.models import Client, MisRequest, User
from app.schemas.mis import MisAssign, MisOut
from app.services.email_stub import send_mis_assigned_client, send_mis_assigned_passenger

router = APIRouter(prefix="/api/admin/mis-requests", tags=["admin-mis"])


@router.get("", response_model=list[MisOut])
def list_mis(
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[MisOut]:
    q = db.query(MisRequest).order_by(MisRequest.id.desc())
    if status_filter:
        q = q.filter(MisRequest.status == status_filter)
    return [MisOut.model_validate(r) for r in q.limit(500).all()]


@router.get("/{mis_id}", response_model=MisOut)
def get_mis(mis_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> MisOut:
    row = db.get(MisRequest, mis_id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    return MisOut.model_validate(row)


@router.post("/{mis_id}/assign", response_model=MisOut)
def assign_mis(
    mis_id: int,
    body: MisAssign,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> MisOut:
    row = db.get(MisRequest, mis_id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    if row.status not in ("pending",):
        raise HTTPException(status_code=400, detail="Can only assign pending requests")
    row.assigned_vehicle = body.assigned_vehicle
    row.assigned_driver = body.assigned_driver
    row.assigned_driver_phone = body.assigned_driver_phone
    row.status = "assigned"
    db.add(row)
    db.commit()
    db.refresh(row)
    client = db.query(Client).options(joinedload(Client.user)).filter(Client.id == row.client_id).first()
    if client and client.user:
        send_mis_assigned_client(
            client.user.email,
            row.id,
            body.assigned_vehicle,
            body.assigned_driver,
            body.assigned_driver_phone,
        )
    if row.passenger_email:
        send_mis_assigned_passenger(row.passenger_email, row.id)
    return MisOut.model_validate(row)
