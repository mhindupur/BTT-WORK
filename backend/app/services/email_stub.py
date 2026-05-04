"""Replace with SMTP/SendGrid integration. Logs body in development."""

import logging

from app.config import settings

log = logging.getLogger(__name__)


def send_welcome_and_verification(to_email: str, verify_url: str, temp_password: str) -> None:
    body = (
        f"Welcome to Basaveshwara Tours and Travels.\n\n"
        f"Verify your email: {verify_url}\n"
        f"Temporary password: {temp_password}\n"
        f"You will be asked to change your password after verification.\n"
    )
    log.info("EMAIL to=%s\n%s", to_email, body)


def send_admin_new_mis(to_email: str, mis_id: int, summary: str) -> None:
    log.info("EMAIL admin=%s MIS #%s\n%s", to_email, mis_id, summary)


def send_mis_assigned_client(
    to_email: str, mis_id: int, vehicle: str, driver: str, driver_phone: str | None
) -> None:
    body = (
        f"MIS request #{mis_id} has been assigned.\n"
        f"Vehicle: {vehicle}\nDriver: {driver}\nContact: {driver_phone or 'N/A'}\n"
    )
    log.info("EMAIL client=%s\n%s", to_email, body)


def send_mis_assigned_passenger(to_email: str, mis_id: int) -> None:
    body = (
        f"Your trip (reference MIS #{mis_id}) is confirmed as assigned.\n"
        f"Further operational details will be shared separately before your reporting time.\n"
    )
    log.info("EMAIL passenger=%s\n%s", to_email, body)


def send_payment_query_to_accounts(team_email: str, line_id: int, message: str) -> None:
    log.info("EMAIL accounts=%s line=%s\n%s", team_email, line_id, message)


def get_accounts_team_email() -> str:
    return settings.admin_email
