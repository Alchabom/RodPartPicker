"""POST /api/auth/refresh and /api/auth/logout: rotation, reuse detection, logout (Task 4.1)."""

from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.auth.cookies import ACCESS_COOKIE, REFRESH_COOKIE
from app.auth.models import RefreshToken
from app.auth.tokens import hash_refresh_token
from app.config import settings
from app.main import app

CODE_URL = "/api/auth/code"
VERIFY_URL = "/api/auth/verify"
REFRESH_URL = "/api/auth/refresh"
LOGOUT_URL = "/api/auth/logout"
ME_URL = "/api/auth/me"
EMAIL = "angler@example.com"


def sign_in(client, fake_email, email=EMAIL):
    """Sign in through /code + /verify; return (user JSON, raw refresh token)."""
    assert client.post(CODE_URL, json={"email": email}).status_code == 202
    code = fake_email.last_code_for(email)
    response = client.post(VERIFY_URL, json={"email": email, "code": code})
    assert response.status_code == 200, response.text
    return response.json(), response.cookies[REFRESH_COOKIE]


def with_refresh(raw):
    """A fresh client holding only this refresh token.

    Each call gets its own cookie jar, so replaying an old token is explicit.
    (Reading client.cookies after a rotation can raise CookieConflict.)
    """
    cookies = {REFRESH_COOKIE: raw} if raw is not None else {}
    return TestClient(app, headers={"Origin": settings.APP_ORIGIN}, cookies=cookies)


def refresh(raw):
    return with_refresh(raw).post(REFRESH_URL)


def logout(raw):
    return with_refresh(raw).post(LOGOUT_URL)


def discard_uncommitted(db):
    """Drop whatever the route changed but didn't commit, then re-read.

    The route shares the test's session, so without this an uncommitted
    change would still be visible and a missing db.commit() would go unseen.
    """
    db.rollback()


def row_for(db, raw):
    discard_uncommitted(db)
    return db.scalars(
        select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(raw))
    ).one()


def family_rows(db, family_id):
    discard_uncommitted(db)
    return db.scalars(
        select(RefreshToken).where(RefreshToken.family_id == family_id)
    ).all()


# ---------- Rotation ----------


def test_refresh_rotates(client, clock, fake_email, db):
    user, old = sign_in(client, fake_email)
    clock.advance(minutes=20)

    response = refresh(old)

    assert response.status_code == 200
    assert response.json() == {"id": user["id"], "email": EMAIL, "displayName": None}
    new = response.cookies[REFRESH_COOKIE]
    assert new != old
    assert ACCESS_COOKIE in response.cookies
    old_row, new_row = row_for(db, old), row_for(db, new)
    assert old_row.revoked_at == clock.now
    assert new_row.revoked_at is None
    assert new_row.family_id == old_row.family_id
    assert new_row.user_id == user["id"]
    assert new_row.expires_at == clock.now + timedelta(days=30)


def test_new_access_token_works(client, clock, fake_email):
    _, old = sign_in(client, fake_email)
    clock.advance(minutes=20)  # the first access token has expired
    response = refresh(old)

    access = response.cookies[ACCESS_COOKIE]
    me = TestClient(app, cookies={ACCESS_COOKIE: access}).get(ME_URL)

    assert me.status_code == 200
    assert me.json()["email"] == EMAIL


def test_unknown_refresh_token_is_401(client):
    assert refresh("not-a-real-token").status_code == 401


def test_missing_refresh_cookie_is_401(client):
    assert refresh(None).status_code == 401


def test_expired_refresh_is_401(client, clock, fake_email):
    _, old = sign_in(client, fake_email)
    clock.advance(days=30, seconds=1)

    assert refresh(old).status_code == 401


def test_refresh_deletes_expired_tokens_for_user(
    client, clock, fake_email, db, make_user
):
    user, raw = sign_in(client, fake_email)
    other = make_user()

    def stored_token(user_id, expires_at):
        row = RefreshToken(
            user_id=user_id,
            family_id="old-family",
            token_hash=hash_refresh_token(f"{user_id}-{expires_at}"),
            expires_at=expires_at,
            created_at=expires_at - timedelta(days=30),
        )
        db.add(row)
        db.flush()
        return row.id

    expired_id = stored_token(user["id"], clock.now - timedelta(days=1))
    others_expired_id = stored_token(other.id, clock.now - timedelta(days=1))
    db.commit()

    assert refresh(raw).status_code == 200

    discard_uncommitted(db)
    assert db.get(RefreshToken, expired_id) is None
    # Only the refreshing user's expired tokens are cleaned up
    assert db.get(RefreshToken, others_expired_id) is not None


# ---------- Reuse detection ----------


def test_reuse_within_grace_keeps_family(client, clock, fake_email, db):
    _, old = sign_in(client, fake_email)
    new = refresh(old).cookies[REFRESH_COOKIE]
    clock.advance(seconds=10)

    # Another tab still sent the old token: rejected, but nothing is revoked
    assert refresh(old).status_code == 401

    assert row_for(db, new).revoked_at is None
    assert refresh(new).status_code == 200


def test_reuse_after_grace_revokes_family(client, clock, fake_email, db):
    _, old = sign_in(client, fake_email)
    new = refresh(old).cookies[REFRESH_COOKIE]
    clock.advance(seconds=31)

    # A replaced token came back late: treat it as stolen, end the session
    assert refresh(old).status_code == 401

    rows = family_rows(db, row_for(db, old).family_id)
    assert len(rows) == 2
    assert all(row.revoked_at is not None for row in rows)
    assert refresh(new).status_code == 401


def test_reuse_after_logout_is_401(client, clock, fake_email, db):
    _, raw = sign_in(client, fake_email)
    assert logout(raw).status_code == 204

    # Inside the grace window, but the family has no live token left
    assert refresh(raw).status_code == 401


# ---------- Logout ----------


def test_logout_revokes_family_and_clears_cookies(client, clock, fake_email, db):
    _, old = sign_in(client, fake_email)
    new = refresh(old).cookies[REFRESH_COOKIE]
    clock.advance(minutes=1)

    response = logout(new)

    assert response.status_code == 204
    rows = family_rows(db, row_for(db, new).family_id)
    assert all(row.revoked_at is not None for row in rows)
    set_cookies = response.headers.get_list("set-cookie")
    for name in (ACCESS_COOKIE, REFRESH_COOKIE):
        (header,) = [h for h in set_cookies if h.startswith(f"{name}=")]
        assert "Max-Age=0" in header
    assert refresh(new).status_code == 401


def test_logout_twice_is_204(client, fake_email):
    _, raw = sign_in(client, fake_email)

    assert logout(raw).status_code == 204
    assert logout(raw).status_code == 204


@pytest.mark.parametrize("raw", [None, "not-a-real-token"])
def test_logout_without_a_valid_cookie_is_204(client, raw):
    response = logout(raw)

    assert response.status_code == 204
    assert len(response.headers.get_list("set-cookie")) == 2
