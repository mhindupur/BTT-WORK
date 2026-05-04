import hashlib
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import EmailVerificationToken, User
from app.schemas.auth import LoginRequest, MessageResponse, NewPasswordRequest, TokenResponse, VerifyEmailRequest
from app.services.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
    token = create_access_token(str(user.id), extra={"role": user.role})
    return TokenResponse(
        access_token=token,
        role=user.role,
        password_must_change=user.password_must_change,
        email_verified=user.email_verified_at is not None,
    )


@router.post("/verify-email", response_model=MessageResponse)
def verify_email(body: VerifyEmailRequest, db: Session = Depends(get_db)) -> MessageResponse:
    th = _hash_token(body.token)
    evt = db.query(EmailVerificationToken).filter(EmailVerificationToken.token_hash == th).first()
    if not evt or evt.consumed_at is not None:
        raise HTTPException(status_code=400, detail="Invalid or used token")
    if evt.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Token expired")
    user = db.get(User, evt.user_id)
    if not user:
        raise HTTPException(status_code=400, detail="User missing")
    user.email_verified_at = datetime.utcnow()
    evt.consumed_at = datetime.utcnow()
    db.add(user)
    db.add(evt)
    db.commit()
    return MessageResponse(message="Email verified. Please set a new password if prompted.")


@router.post("/change-temporary-password", response_model=MessageResponse)
def change_temporary_password(
    body: NewPasswordRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MessageResponse:
    if not user.password_must_change:
        raise HTTPException(status_code=400, detail="Password change not required")
    user.password_hash = hash_password(body.new_password)
    user.password_must_change = False
    db.add(user)
    db.commit()
    return MessageResponse(message="Password updated.")
