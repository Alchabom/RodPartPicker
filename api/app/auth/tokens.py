"""Access JWTs and refresh tokens."""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

import jwt
from sqlalchemy import delete, exists, select, update
from sqlalchemy.orm import Session

from app.auth.models import RefreshToken
from app.config import settings

ACCESS_TOKEN_TTL = timedelta(minutes=15)
REFRESH_TOKEN_TTL = timedelta(days=30)
ALGORITHM = "HS256"
# How long a just-replaced refresh token is forgiven (another tab's race)
GRACE_WINDOW = timedelta(seconds=30)


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
    # algorithms is pinned so the token's own header can't pick the algorithm
    # (that's how `alg: none` attacks work). verify_exp is off because PyJWT
    # would check exp against the real clock, not `now`; we check it below.
    payload = jwt.decode(
        token,
        settings.JWT_SECRET,
        algorithms=[ALGORITHM],
        options={"verify_exp": False, "require": ["sub", "exp"]},
    )

    # A validly signed token can still carry junk claims. Turn them into
    # InvalidTokenError so callers answer 401, not 500 (bool is an int subclass)
    exp = payload["exp"]
    if not isinstance(exp, int | float) or isinstance(exp, bool):
        raise jwt.InvalidTokenError("exp must be a number")
    try:
        user_id = int(payload["sub"])
    except TypeError, ValueError:
        raise jwt.InvalidTokenError("sub must be a user ID") from None

    if exp <= int(now.replace(tzinfo=UTC).timestamp()):
        raise jwt.ExpiredSignatureError("Signature has expired")

    return user_id


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


def revoke_family(db: Session, family_id: str, now: datetime) -> None:
    """Task 4.1. Set revoked_at = now on every unrevoked token in the family.

    One bulk UPDATE (like "consume older codes" in POST /code). Filter on
    revoked_at IS NULL so tokens revoked earlier keep their original time.
    Don't commit; the route does.
    """
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.family_id == family_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=now)
    )


def rotate_refresh_token(
    db: Session, raw: str, now: datetime
) -> tuple[int, str] | None:
    """Task 4.1. Swap a refresh token for a new one in the same family.

    Returns (user_id, new_raw), or None if the token is rejected. Applies any
    revocation itself; the caller commits either way. Spec: "POST /refresh",
    steps 2-5.

    1. Look the row up by token_hash (hash_refresh_token(raw)), locked with
       .with_for_update(), so two simultaneous refreshes can't both rotate it.
    2. No row, or expires_at <= now -> None.
    3. Already revoked (revoked_at is not None):
       - Revoked under GRACE_WINDOW ago AND the family still has a live token
         (some row with revoked_at IS NULL and expires_at > now) -> None and
         change nothing. That's another tab that just lost the race.
       - Otherwise -> revoke_family(...), then None. A replaced token came
         back late, or after logout: treat it as stolen.
       "Family has a live token" is a yes/no question:
       db.scalar(select(exists().where(...))) returns True or False.
    4. Valid: set row.revoked_at = now, issue_refresh_token(db, row.user_id,
       row.family_id, now), and return (row.user_id, new_raw).

    Expired rows are cleaned up separately (delete_expired_tokens), after the
    caller commits.
    """
    row = db.scalars(
        select(RefreshToken)
        .where(RefreshToken.token_hash == hash_refresh_token(raw))
        .with_for_update()
    ).first()
    if row is None or row.expires_at <= now:
        return None

    if row.revoked_at is not None:
        family_is_live = db.scalar(
            select(
                exists().where(
                    RefreshToken.family_id == row.family_id,
                    RefreshToken.revoked_at.is_(None),
                    RefreshToken.expires_at > now,
                )
            )
        )
        if not (now - row.revoked_at < GRACE_WINDOW and family_is_live):
            revoke_family(db, row.family_id, now)
        return None

    row.revoked_at = now
    new_raw = issue_refresh_token(db, row.user_id, row.family_id, now)
    return row.user_id, new_raw


def delete_expired_tokens(db: Session, user_id: int, now: datetime) -> None:
    """Delete this user's expired refresh tokens. Don't commit; the route does.

    Run it in its own transaction, after the rotation commits. Under REPEATABLE
    READ this DELETE locks every row of the user it scans, including another
    device's just-inserted token, so inside the rotation's transaction two
    devices refreshing at once could deadlock each other (MySQL error 1213).
    Only expired rows go: a revoked but unexpired row is still needed to
    detect reuse.
    """
    db.execute(
        delete(RefreshToken).where(
            RefreshToken.user_id == user_id, RefreshToken.expires_at <= now
        )
    )
