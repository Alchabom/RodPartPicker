"""Request dependencies: the clock, the client IP and the signed-in user (Task 2.4)."""

from datetime import UTC, datetime
from typing import Annotated

import jwt
from fastapi import Cookie, Depends, HTTPException, Request

from app.auth.cookies import ACCESS_COOKIE
from app.auth.tokens import decode_access_token
from app.config import settings


def get_now() -> datetime:
    """Current time as naive UTC, matching the DATETIME columns. Tests override it."""
    return datetime.now(UTC).replace(tzinfo=None)


Now = Annotated[datetime, Depends(get_now)]


def get_client_ip(request: Request) -> str:
    """First X-Forwarded-For address when TRUST_PROXY_HEADERS, else the socket peer.

    The header is client-controlled, so it's only trusted behind our own proxy.
    """
    if settings.TRUST_PROXY_HEADERS:
        first = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        if first:  # a blank entry must not become one shared "" bucket
            return first
    if request.client is None:
        return "unknown"
    return request.client.host


ClientIp = Annotated[str, Depends(get_client_ip)]


def get_current_user_id(
    now: Now,
    access_token: Annotated[str | None, Cookie(alias=ACCESS_COOKIE)] = None,
) -> int:
    """The user ID from the access cookie, with no database lookup.

    Every failure is the same bare 401, so a caller learns nothing about why.
    """
    if access_token is None:
        raise HTTPException(status_code=401)
    try:
        return decode_access_token(access_token, now)
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401) from None


CurrentUserId = Annotated[int, Depends(get_current_user_id)]
