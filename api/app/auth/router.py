"""Auth routes under /api/auth (Tasks 3.1-3.3; /refresh and /logout come in PR 4).

SKELETON: replace each NotImplementedError. Spec: "API" -> each route's section.
Also add `api.include_router(auth_router)` in app/main.py (Task 3.1), or every
test gets a 404.
"""

import uuid
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError  # noqa: F401

from app.auth.codes import CODE_TTL, MAX_ATTEMPTS, codes_match, generate_code, hash_code
from app.auth.cookies import set_auth_cookies
from app.auth.deps import ClientIp, CurrentUserId, Now
from app.auth.email import EmailSender, EmailSendError, get_email_sender
from app.auth.models import LoginCode, User
from app.auth.rate_limit import retry_after
from app.auth.schemas import CodeRequestIn, DisplayNameIn, UserOut, VerifyIn
from app.auth.tokens import issue_access_token, issue_refresh_token
from app.db import DbSession

router = APIRouter(prefix="/auth", tags=["auth"])

Sender = Annotated[EmailSender, Depends(get_email_sender)]

INVALID_CODE = "Invalid or expired code"


@router.post("/code", status_code=202)
def request_code(
    body: CodeRequestIn, db: DbSession, now: Now, ip: ClientIp, sender: Sender
) -> dict:
    """Task 3.1. Follow the spec's six steps in order:

    1. (Done by CodeRequestIn: body.email is already normalized.)
    2. Delete login_codes rows with created_at older than 24 h.
    3. n = retry_after(...). If n: raise HTTPException(429, headers={"Retry-After": str(n)}).
    4. Set consumed_at = now on this email's unconsumed codes (an UPDATE).
    5. Add the new LoginCode (hash_code, never the raw code; expires_at =
       now + CODE_TTL), db.flush(), send, THEN db.commit().
       Catch only EmailSendError: db.rollback(), then
       raise HTTPException(503, "Couldn't send the code, try again").
       Rolling back undoes steps 2-5, so a failed send costs no rate limit.
    6. return {}. Same answer whether or not an account exists.
    """
    db.execute(
        delete(LoginCode).where(LoginCode.created_at < now - timedelta(hours=24))
    )

    wait = retry_after(db, body.email, ip, now)
    if wait is not None:
        raise HTTPException(429, headers={"Retry-After": str(wait)})

    db.execute(
        update(LoginCode)
        .where(LoginCode.email == body.email, LoginCode.consumed_at.is_(None))
        .values(consumed_at=now)
    )

    code = generate_code()
    db.add(
        LoginCode(
            email=body.email,
            code_hash=hash_code(body.email, code),
            requester_ip=ip,
            expires_at=now + CODE_TTL,
            created_at=now,
        )
    )
    db.flush()
    try:
        sender.send_login_code(body.email, code)
    except EmailSendError:
        db.rollback()
        raise HTTPException(503, "Couldn't send the code, try again")
    db.commit()
    return {}


@router.post("/verify")
def verify_code(body: VerifyIn, response: Response, db: DbSession, now: Now) -> UserOut:
    """Task 3.2.

    1. Select this email's newest code that is unconsumed and has
       expires_at > now, ordered by created_at desc, .limit(1),
       .with_for_update() (locks the row so parallel guesses queue up).
    2. None, or not codes_match(...): if there was a row, attempts += 1 and
       set consumed_at once attempts reaches MAX_ATTEMPTS. db.commit() BEFORE
       raising HTTPException(400, INVALID_CODE): raising makes FastAPI drop
       the session, and an uncommitted attempt would be rolled back.
    3. Match: consumed_at = now; find the User by email or create one
       (created_at=now); db.flush() so it has an id; issue both tokens
       (family_id=str(uuid.uuid4())); db.commit(); set_auth_cookies(response, ...);
       return the user (UserOut reads it thanks to from_attributes).
    """
    row = db.scalars(
        select(LoginCode)
        .where(
            LoginCode.email == body.email,
            LoginCode.consumed_at.is_(None),
            LoginCode.expires_at > now,
        )
        .order_by(LoginCode.created_at.desc())
        .limit(1)
        .with_for_update()
    ).first()

    if row is None or not codes_match(row.code_hash, body.email, body.code):
        if row is not None:
            row.attempts += 1
            if row.attempts >= MAX_ATTEMPTS:
                row.consumed_at = now
        # Commit before raising, or the session closes and the attempt is lost
        db.commit()
        raise HTTPException(400, INVALID_CODE)

    row.consumed_at = now
    user = db.scalars(select(User).where(User.email == body.email)).first()
    if user is None:
        user = User(email=body.email, created_at=now)
        db.add(user)
        db.flush()  # assigns user.id, which both tokens need
    access = issue_access_token(user.id, now)
    refresh = issue_refresh_token(db, user.id, str(uuid.uuid4()), now)
    db.commit()
    set_auth_cookies(response, access, refresh)
    return user


@router.get("/me")
def read_me(user_id: CurrentUserId, db: DbSession) -> UserOut:
    """Task 3.3. db.get(User, user_id); None -> HTTPException(401)."""
    raise NotImplementedError


@router.put("/me")
def update_me(body: DisplayNameIn, user_id: CurrentUserId, db: DbSession) -> UserOut:
    """Task 3.3. Load the user as in read_me, set display_name, commit.

    The unique index decides "taken" (ignoring case, via the column's
    collation), so don't pre-check with a SELECT; two requests could race past
    it. Catch IntegrityError: db.rollback(), then HTTPException(409, "Display name taken").
    """
    raise NotImplementedError
