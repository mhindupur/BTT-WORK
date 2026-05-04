import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import Base, engine
from app.models import User
from app.services.security import hash_password

log = logging.getLogger(__name__)


def ensure_schema() -> None:
    Base.metadata.create_all(bind=engine)


def ensure_admin_user(db: Session) -> None:
    existing = db.scalar(select(User).where(User.email == settings.admin_email))
    if existing:
        return
    user = User(
        email=settings.admin_email,
        password_hash=hash_password(settings.admin_password),
        role="admin",
        email_verified_at=datetime.utcnow(),
        password_must_change=False,
    )
    db.add(user)
    db.commit()
    log.info("Seeded admin user %s", settings.admin_email)
