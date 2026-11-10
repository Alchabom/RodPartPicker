import json
import logging

import httpx
import pytest

from app.auth.email import (
    RESEND_URL,
    ConsoleEmailSender,
    EmailSendError,
    ResendEmailSender,
    get_email_sender,
)
from app.config import settings

SENDER = "RodPartPicker <onboarding@resend.dev>"


def test_get_email_sender_defaults_to_console(monkeypatch):
    monkeypatch.setattr(settings, "EMAIL_BACKEND", "console")
    assert isinstance(get_email_sender(), ConsoleEmailSender)


def test_console_sender_logs_code(caplog):
    caplog.set_level(logging.INFO, logger="uvicorn.error")
    ConsoleEmailSender().send_login_code("a@x.com", "012345")
    logged = [r for r in caplog.records if r.name == "uvicorn.error"]
    assert any("012345" in r.getMessage() for r in logged)


def test_resend_sender_posts_expected_request():
    requests = []

    def handler(request):
        requests.append(request)
        return httpx.Response(200, json={"id": "email-1"})

    sender = ResendEmailSender(
        "re_test_key", SENDER, transport=httpx.MockTransport(handler)
    )
    sender.send_login_code("a@x.com", "012345")

    assert len(requests) == 1
    request = requests[0]
    assert request.method == "POST"
    assert str(request.url) == RESEND_URL == "https://api.resend.com/emails"
    assert request.headers["Authorization"] == "Bearer re_test_key"
    body = json.loads(request.content)
    assert body["to"] == ["a@x.com"]
    assert body["from"] == SENDER
    assert "012345" in body["text"]


def test_resend_sender_wraps_http_errors():
    transport = httpx.MockTransport(lambda request: httpx.Response(500))
    sender = ResendEmailSender("re_test_key", SENDER, transport=transport)
    with pytest.raises(EmailSendError):
        sender.send_login_code("a@x.com", "012345")


def test_resend_sender_wraps_timeouts():
    def handler(request):
        raise httpx.ConnectTimeout("timed out", request=request)

    sender = ResendEmailSender(
        "re_test_key", SENDER, transport=httpx.MockTransport(handler)
    )
    with pytest.raises(EmailSendError):
        sender.send_login_code("a@x.com", "012345")


def test_resend_sender_sends_twice():
    # Each send opens and closes its own client, so the sender stays reusable
    requests = []

    def handler(request):
        requests.append(request)
        return httpx.Response(200, json={"id": "email-1"})

    sender = ResendEmailSender(
        "re_test_key", SENDER, transport=httpx.MockTransport(handler)
    )
    sender.send_login_code("a@x.com", "012345")
    sender.send_login_code("b@x.com", "678901")

    assert [json.loads(r.content)["to"] for r in requests] == [["a@x.com"], ["b@x.com"]]
