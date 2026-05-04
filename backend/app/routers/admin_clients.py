import hashlib
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.database import get_db
from app.deps import require_admin
from app.models import Client, EmailVerificationToken, User
from app.schemas.client_admin import ClientCreate, ClientOut, ClientUpdate
from app.schemas.auth import MessageResponse
from app.services.email_stub import send_welcome_and_verification
from app.services.security import hash_password

router = APIRouter(prefix="/api/admin/clients", tags=["admin-clients"])


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def _to_out(c: Client) -> ClientOut:
    return ClientOut(
        id=c.id,
        company_name=c.company_name,
        email=c.user.email,
        phone=c.phone,
        office_phone=c.office_phone,
        contracting_first_name=c.contracting_first_name,
        contracting_last_name=c.contracting_last_name,
        email_verified=c.user.email_verified_at is not None,
        password_must_change=c.user.password_must_change,
    )


@router.get("", response_model=list[ClientOut])
def list_clients(
    q: str | None = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[ClientOut]:
    stmt = db.query(Client).options(joinedload(Client.user))
    if q:
        like = f"%{q}%"
        stmt = stmt.join(User).filter(
            or_(
                Client.company_name.like(like),
                User.email.like(like),
                Client.contracting_first_name.like(like),
                Client.contracting_last_name.like(like),
                Client.phone.like(like),
            )
        )
    rows = stmt.order_by(Client.id.desc()).limit(200).all()
    return [_to_out(c) for c in rows]


@router.post("", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
def create_client(body: ClientCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> ClientOut:
    if db.query(User).filter(User.email == str(body.email)).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    temp_password = secrets.token_urlsafe(10)
    raw_verify = secrets.token_urlsafe(32)
    user = User(
        email=str(body.email),
        password_hash=hash_password(temp_password),
        role="client",
        email_verified_at=None,
        password_must_change=True,
    )
    db.add(user)
    db.flush()
    client = Client(
        user_id=user.id,
        company_name=body.company_name,
        phone=body.phone,
        office_phone=body.office_phone,
        contracting_first_name=body.contracting_first_name,
        contracting_last_name=body.contracting_last_name,
    )
    db.add(client)
    db.flush()
    evt = EmailVerificationToken(
        user_id=user.id,
        token_hash=_hash_token(raw_verify),
        expires_at=datetime.utcnow() + timedelta(days=7),
    )
    db.add(evt)
    db.commit()
    db.refresh(client)
    client.user = user
    verify_url = f"{settings.frontend_base_url}/verify-email?token={raw_verify}"
    send_welcome_and_verification(str(body.email), verify_url, temp_password)
    return _to_out(client)


@router.patch("/{client_id}", response_model=ClientOut)
def update_client(
    client_id: int,
    body: ClientUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> ClientOut:
    client = db.query(Client).options(joinedload(Client.user)).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(client, k, v)
    db.add(client)
    db.commit()
    db.refresh(client)
    return _to_out(client)


@router.post("/{client_id}/reset-password", response_model=MessageResponse)
def reset_password(client_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> MessageResponse:
    client = db.query(Client).options(joinedload(Client.user)).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    temp_password = secrets.token_urlsafe(10)
    client.user.password_hash = hash_password(temp_password)
    client.user.password_must_change = True
    db.add(client.user)
    db.commit()
    send_welcome_and_verification(client.user.email, "(use existing verify flow or resend invite)", temp_password)
    return MessageResponse(message="Password reset; notification sent (stub).")
