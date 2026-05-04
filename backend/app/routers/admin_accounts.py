from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import require_admin
from app.models import PaymentBatch, PaymentLine, User
from app.schemas.payment import BatchSummary, PaymentLineAdmin
from app.services.excel_import import parse_payment_workbook, row_to_payment_line_dict
from app.services.whatsapp_stub import public_payment_url, send_payment_link

router = APIRouter(prefix="/api/admin/accounts", tags=["admin-accounts"])


@router.post("/uploads", response_model=BatchSummary)
async def upload_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> BatchSummary:
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xlsm")):
        raise HTTPException(status_code=400, detail="Upload an .xlsx file")
    raw = await file.read()
    try:
        parsed_rows = parse_payment_workbook(raw)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Could not parse Excel: {exc}") from exc
    batch = PaymentBatch(
        uploaded_by=admin.id,
        original_filename=file.filename,
        period_label=None,
        status="parsed",
        row_count=len(parsed_rows),
    )
    db.add(batch)
    db.flush()
    for pr in parsed_rows:
        d = row_to_payment_line_dict(pr)
        line = PaymentLine(batch_id=batch.id, **d)
        db.add(line)
    db.commit()
    db.refresh(batch)
    return BatchSummary.model_validate(batch)


@router.get("/batches", response_model=list[BatchSummary])
def list_batches(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> list[BatchSummary]:
    rows = db.query(PaymentBatch).order_by(PaymentBatch.id.desc()).limit(100).all()
    return [BatchSummary.model_validate(r) for r in rows]


@router.get("/batches/{batch_id}/lines", response_model=list[PaymentLineAdmin])
def list_lines(batch_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> list[PaymentLineAdmin]:
    if not db.get(PaymentBatch, batch_id):
        raise HTTPException(status_code=404, detail="Batch not found")
    rows = db.query(PaymentLine).filter(PaymentLine.batch_id == batch_id).all()
    return [PaymentLineAdmin.model_validate(r) for r in rows]


@router.post("/batches/{batch_id}/dispatch-whatsapp")
def dispatch_whatsapp(batch_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> dict:
    batch = db.get(PaymentBatch, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    lines = db.query(PaymentLine).filter(PaymentLine.batch_id == batch_id).all()
    sent = 0
    for line in lines:
        if not line.driver_phone or line.whatsapp_sent_at:
            continue
        url = public_payment_url(line.public_token)
        send_payment_link(line.driver_phone, url, line.driver_name)
        from datetime import datetime

        line.whatsapp_sent_at = datetime.utcnow()
        db.add(line)
        sent += 1
    db.commit()
    return {"sent": sent, "frontend_base": settings.frontend_base_url}
