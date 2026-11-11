"""Rate limits for POST /auth/code (Task 3.1). Spec: "POST /code", step 3.

How the limits work together: docs/auth/rate-limiting.md.
"""

import math
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.models import LoginCode

COOLDOWN = timedelta(seconds=60)
WINDOW = timedelta(hours=1)
MAX_PER_EMAIL = 5
MAX_PER_IP = 20


def _seconds_until(moment: datetime, now: datetime) -> int:
    """Whole seconds from now until moment, rounded up so the client never
    retries while still blocked."""
    return math.ceil((moment - now).total_seconds())


def _window_wait(db: Session, condition, limit: int, now: datetime) -> int | None:
    """Seconds until the oldest row matching `condition` leaves the window,
    if `limit` or more rows matched within it; otherwise None."""
    count, oldest = db.execute(
        select(func.count(LoginCode.id), func.min(LoginCode.created_at)).where(
            condition, LoginCode.created_at > now - WINDOW
        )
    ).one()
    if count >= limit:
        return _seconds_until(oldest + WINDOW, now)
    return None


def retry_after(db: Session, email: str, ip: str, now: datetime) -> int | None:
    """Seconds the caller must wait before another code, or None if allowed.

    Three checks, in order; return the first that applies:
    1. Cooldown: this email's NEWEST row is under 60 s old
       -> wait until newest.created_at + COOLDOWN.
    2. This email has >= MAX_PER_EMAIL rows created in the last WINDOW
       -> wait until the OLDEST of those rows turns one WINDOW old.
    3. This IP (requester_ip) has >= MAX_PER_IP rows in the last WINDOW
       -> same as 2, for the IP's oldest row in the window.

    Every row counts, consumed or not: a replaced code still cost an email.
    """
    newest = db.scalar(
        select(func.max(LoginCode.created_at)).where(LoginCode.email == email)
    )
    if newest is not None and now - newest < COOLDOWN:
        return _seconds_until(newest + COOLDOWN, now)

    wait = _window_wait(db, LoginCode.email == email, MAX_PER_EMAIL, now)
    if wait is not None:
        return wait

    wait = _window_wait(db, LoginCode.requester_ip == ip, MAX_PER_IP, now)
    if wait is not None:
        return wait

    return None
