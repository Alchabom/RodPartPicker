"""Setting and clearing the auth cookies."""

from fastapi import Response

from app.auth.tokens import ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL
from app.config import settings

ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"
ACCESS_PATH = "/api"
REFRESH_PATH = "/api/auth"


def set_auth_cookies(response: Response, access: str, refresh: str) -> None:
    """Set the access and refresh cookies on `response`."""
    # Short-lived access token, sent with every /api request
    response.set_cookie(
        ACCESS_COOKIE,  # name: access_token
        access,  # value: JWT string
        path=ACCESS_PATH,  # browser sends to /api/...
        # 900 s, then the browser drops it
        max_age=int(ACCESS_TOKEN_TTL.total_seconds()),
        httponly=True,  # JS can't read it
        samesite="lax",  # not sent on cross-site posts (CSRF)
        # HTTPS only in prod; read per call because tests turn it off
        secure=settings.COOKIE_SECURE,
    )

    # Long-lived refresh token, sent only to /api/auth/...
    response.set_cookie(
        REFRESH_COOKIE,
        refresh,
        path=REFRESH_PATH,
        max_age=int(REFRESH_TOKEN_TTL.total_seconds()),  # 30 days
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,
    )


def clear_auth_cookies(response: Response) -> None:
    """Delete both cookies.

    Path and flags must match set_auth_cookies exactly, or the browser treats
    it as a different cookie and keeps the real one (users stay logged in).
    """
    response.delete_cookie(
        ACCESS_COOKIE,
        path=ACCESS_PATH,
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,
    )

    response.delete_cookie(
        REFRESH_COOKIE,
        path=REFRESH_PATH,
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,
    )
