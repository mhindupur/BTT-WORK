import logging

from app.config import settings

log = logging.getLogger(__name__)


def send_payment_link(phone: str, url: str, driver_name: str | None) -> None:
    """Wire to Meta WhatsApp Cloud API; template messages often required for first contact."""
    log.info("WHATSAPP to=%s name=%s url=%s", phone, driver_name, url)


def public_payment_url(token: str) -> str:
    base = settings.frontend_base_url.rstrip("/")
    return f"{base}/pay/{token}"
