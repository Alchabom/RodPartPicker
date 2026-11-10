"""Access JWTs and refresh tokens (rotation comes in PR 4)."""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

import jwt
from sqlalchemy.orm import Session

from app.auth.models import RefreshToken
from app.config import settings

ACCESS_TOKEN_TTL = timedelta(minutes=15)
REFRESH_TOKEN_TTL = timedelta(days=30)
ALGORITHM = "HS256"


def issue_access_token(user_id: int, now: datetime) -> str:
    """A signed HS256 JWT with claims sub=str(user_id) and exp=now + 15 min."""
    now_ts = int(now.replace(tzinfo=UTC).timestamp())
    payload = {
        "sub": str(user_id),
        "iat": now_ts,
        "exp": now_ts + int(ACCESS_TOKEN_TTL.total_seconds()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_access_token(token: str, now: datetime) -> int:
    """The user ID inside a valid token. Raises jwt.InvalidTokenError otherwise."""
    payload = jwt.decode(
        token,
        settings.JWT_SECRET,
        algorithms=[ALGORITHM],
        options={"verify_exp": False, "require": ["sub", "exp"]},
    )

    now_ts = int(now.replace(tzinfo=UTC).timestamp())

    if payload["exp"] <= now_ts:
        raise jwt.ExpiredSignatureError("Signature has expired")

    return int(payload["sub"])


def hash_refresh_token(raw: str) -> str:
    """Hex SHA-256 of the raw token. Plain SHA-256 is enough: 256 random bits."""
    return hashlib.sha256(raw.encode()).hexdigest()


def issue_refresh_token(
    db: Session, user_id: int, family_id: str, now: datetime
) -> str:
    """Store a new refresh token's hash and return the raw token for the cookie.

    Raw token: secrets.token_urlsafe(32). Row: expires_at = now + 30 days,
    created_at = now. db.add + db.flush, but DON'T commit (the route commits).
    """
    raw = secrets.token_urlsafe(32)
    row = RefreshToken(
        user_id=user_id,
        family_id=family_id,
        token_hash=hash_refresh_token(raw),
        expires_at=now + REFRESH_TOKEN_TTL,
        created_at=now,
    )
    db.add(row)
    db.flush()
    return raw
