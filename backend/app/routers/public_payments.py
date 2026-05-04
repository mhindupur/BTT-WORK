from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PaymentBatch, PaymentLine, PaymentQuery
from app.schemas.payment import PaymentLinePublic, PaymentQueryCreate
from app.schemas.auth import MessageResponse
from app.services.email_stub import get_accounts_team_email, send_payment_query_to_accounts

router = APIRouter(prefix="/api/public/payments", tags=["public-payments"])


@router.get("/{token}", response_model=PaymentLinePublic)
def get_payment(token: str, db: Session = Depends(get_db)) -> PaymentLinePublic:
    line = db.query(PaymentLine).filter(PaymentLine.public_token == token).first()
    if not line:
        raise HTTPException(status_code=404, detail="Not found")
    batch = db.get(PaymentBatch, line.batch_id)
    out = PaymentLinePublic.model_validate(line)
    return out.model_copy(update={"period_label": batch.period_label if batch else None})


@router.post("/{token}/queries", response_model=MessageResponse)
def raise_query(token: str, body: PaymentQueryCreate, db: Session = Depends(get_db)) -> MessageResponse:
    line = db.query(PaymentLine).filter(PaymentLine.public_token == token).first()
    if not line:
        raise HTTPException(status_code=404, detail="Not found")
    q = PaymentQuery(line_id=line.id, message=body.message)
    db.add(q)
    db.commit()
    send_payment_query_to_accounts(get_accounts_team_email(), line.id, body.message)
    return MessageResponse(message="Query submitted.")
