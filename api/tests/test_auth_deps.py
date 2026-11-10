from datetime import UTC, datetime, timedelta

import pytest
from fastapi import Response
from starlette.requests import Request

from app.auth.cookies import (
    ACCESS_COOKIE,
    REFRESH_COOKIE,
    clear_auth_cookies,
    set_auth_cookies,
)
from app.auth.deps import get_client_ip, get_now
from app.auth.email import EmailSendError, get_email_sender
from app.config import settings
from app.main import app


def make_request(headers=(), client=("10.0.0.1", 1)):
    scope = {
        "type": "http",
        "headers": [(k.lower().encode(), v.encode()) for k, v in headers],
    }
    if client is not None:
        scope["client"] = client
    return Request(scope)


def parse_set_cookies(response):
    """{cookie name: {"value": ..., attribute (lowercased): value or True}}."""
    cookies = {}
    for header in response.headers.getlist("set-cookie"):
        first, *attrs = (part.strip() for part in header.split(";"))
        name, value = first.split("=", 1)
        parsed = {"value": value}
        for attr in attrs:
            key, _, attr_value = attr.partition("=")
            parsed[key.lower()] = attr_value or True
        cookies[name] = parsed
    return cookies


# ---------- Client IP ----------

FORWARDED = [("X-Forwarded-For", "1.2.3.4, 10.0.0.1")]


def test_client_ip_ignores_forwarded_header_by_default(monkeypatch):
    monkeypatch.setattr(settings, "TRUST_PROXY_HEADERS", False)
    assert get_client_ip(make_request(FORWARDED)) == "10.0.0.1"


def test_client_ip_uses_forwarded_header_when_trusted(monkeypatch):
    monkeypatch.setattr(settings, "TRUST_PROXY_HEADERS", True)
    assert get_client_ip(make_request(FORWARDED)) == "1.2.3.4"


@pytest.mark.parametrize("header", [" ", ",1.2.3.4"])
def test_client_ip_ignores_blank_forwarded_entry(monkeypatch, header):
    # An empty first entry must not become one shared "" rate-limit bucket
    monkeypatch.setattr(settings, "TRUST_PROXY_HEADERS", True)
    request = make_request([("X-Forwarded-For", header)])
    assert get_client_ip(request) == "10.0.0.1"


def test_client_ip_without_client_is_unknown(monkeypatch):
    monkeypatch.setattr(settings, "TRUST_PROXY_HEADERS", False)
    assert get_client_ip(make_request(client=None)) == "unknown"


# ---------- Cookies ----------


def test_set_auth_cookies_flags():
    response = Response()
    set_auth_cookies(response, "access-jwt", "refresh-raw")
    cookies = parse_set_cookies(response)

    expected = {
        ACCESS_COOKIE: ("access-jwt", "/api", "900"),
        REFRESH_COOKIE: ("refresh-raw", "/api/auth", "2592000"),
    }
    assert set(cookies) == set(expected)
    for name, (value, path, max_age) in expected.items():
        cookie = cookies[name]
        assert cookie["value"] == value
        assert cookie.get("httponly") is True
        assert cookie.get("samesite", "").lower() == "lax"
        assert cookie.get("path") == path
        assert cookie.get("max-age") == max_age
        # The session-wide fixture turns COOKIE_SECURE off
        assert "secure" not in cookie


def test_clear_auth_cookies_uses_matching_paths():
    # A deleting Set-Cookie only works if its Path matches the one that set it
    response = Response()
    clear_auth_cookies(response)
    cookies = parse_set_cookies(response)

    assert set(cookies) == {ACCESS_COOKIE, REFRESH_COOKIE}
    for name, path in [(ACCESS_COOKIE, "/api"), (REFRESH_COOKIE, "/api/auth")]:
        cookie = cookies[name]
        assert cookie.get("max-age") == "0"
        assert cookie.get("path") == path
        assert cookie.get("httponly") is True
        assert cookie.get("samesite", "").lower() == "lax"


# ---------- Time ----------


def test_get_now_is_naive_utc():
    now = get_now()
    assert now.tzinfo is None
    real = datetime.now(UTC).replace(tzinfo=None)
    assert abs(real - now) < timedelta(seconds=5)


# ---------- Fixture sanity checks ----------


def test_clock_fixture_advances(clock):
    assert clock.now == datetime(2026, 1, 1, 12, 0)
    assert app.dependency_overrides[get_now]() == clock.now

    clock.advance(minutes=10, seconds=1)
    assert clock.now == datetime(2026, 1, 1, 12, 10, 1)
    assert app.dependency_overrides[get_now]() == clock.now


def test_fake_email_records_and_fails(fake_email):
    sender = app.dependency_overrides[get_email_sender]()
    assert sender is fake_email

    sender.send_login_code("a@x.com", "111111")
    sender.send_login_code("b@x.com", "222222")
    sender.send_login_code("a@x.com", "333333")
    assert fake_email.sent == [
        ("a@x.com", "111111"),
        ("b@x.com", "222222"),
        ("a@x.com", "333333"),
    ]
    assert fake_email.last_code_for("a@x.com") == "333333"

    fake_email.fail = True
    with pytest.raises(EmailSendError):
        sender.send_login_code("c@x.com", "444444")
    assert len(fake_email.sent) == 3
