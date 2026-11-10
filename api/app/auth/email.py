"""Sending login codes by email."""

import logging
from typing import Protocol

import httpx

from app.config import settings

SUBJECT = "Your RodPartPicker sign-in code"
BODY = "Your sign-in code is {code}. It expires in 10 minutes."
RESEND_URL = "https://api.resend.com/emails"


class EmailSendError(Exception):
    """Any failure to send. The /code route turns it into a 503."""


class EmailSender(Protocol):
    def send_login_code(self, to: str, code: str) -> None: ...


class ConsoleEmailSender:
    """Dev sender: logs the code instead of emailing it."""

    def send_login_code(self, to: str, code: str) -> None:
        # Log through logging.getLogger("uvicorn.error").info(...): uvicorn
        # configures that logger, so the line shows in `fastapi dev` output.
        # A plain logging.getLogger(__name__) is silent by default.
        logging.getLogger("uvicorn.error").info("Login code for %s: %s", to, code)


class ResendEmailSender:
    """Prod sender: POSTs to Resend's HTTP API."""

    def __init__(
        self, api_key: str, sender: str, transport: httpx.BaseTransport | None = None
    ) -> None:
        # `transport` exists so tests can pass httpx.MockTransport
        self.sender = sender
        self.client = httpx.Client(
            transport=transport,
            timeout=10,
            headers={"Authorization": f"Bearer {api_key}"},
        )

    def send_login_code(self, to: str, code: str) -> None:
        # raise_for_status turns a 4xx/5xx into an exception; httpx.HTTPError
        # covers that and timeouts alike
        try:
            response = self.client.post(
                RESEND_URL,
                json={
                    "from": self.sender,
                    "to": [to],
                    "subject": SUBJECT,
                    "text": BODY.format(code=code),
                },
            )
            response.raise_for_status()
        except httpx.HTTPError as e:
            raise EmailSendError("Failed to send login code") from e


def get_email_sender() -> EmailSender:
    """FastAPI dependency: pick the sender from settings.EMAIL_BACKEND."""

    if settings.EMAIL_BACKEND == "resend":
        return ResendEmailSender(settings.RESEND_API_KEY, settings.EMAIL_FROM)
    else:
        return ConsoleEmailSender()
