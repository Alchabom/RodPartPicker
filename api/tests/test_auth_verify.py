"""POST /api/auth/verify: checking a code and starting a session (Task 3.2)."""

from sqlalchemy import func, select

from app.auth.codes import hash_code
from app.auth.cookies import ACCESS_COOKIE, REFRESH_COOKIE
from app.auth.models import LoginCode, RefreshToken, User

CODE_URL = "/api/auth/code"
VERIFY_URL = "/api/auth/verify"
EMAIL = "angler@example.com"


def request_code(client, fake_email, email=EMAIL):
    response = client.post(CODE_URL, json={"email": email})
    assert response.status_code == 202
    return fake_email.last_code_for(email.strip().lower())


def verify(client, code, email=EMAIL):
    return client.post(VERIFY_URL, json={"email": email, "code": code})


def wrong_code(code):
    return "000000" if code != "000000" else "111111"


def latest_code_row(db, email=EMAIL):
    db.expire_all()
    return db.scalars(
        select(LoginCode)
        .where(LoginCode.email == email)
        .order_by(LoginCode.id.desc())
        .limit(1)
    ).one()


def count_users(db, email=EMAIL):
    db.expire_all()
    return db.scalar(select(func.count(User.id)).where(User.email == email))


def test_verify_signs_in_and_creates_user(client, clock, fake_email, db):
    code = request_code(client, fake_email)

    response = verify(client, code)

    assert response.status_code == 200
    body = response.json()
    user = db.scalars(select(User).where(User.email == EMAIL)).one()
    assert body == {"id": user.id, "email": EMAIL, "displayName": None}
    assert user.created_at == clock.now
    assert ACCESS_COOKIE in client.cookies
    assert REFRESH_COOKIE in client.cookies
    assert count_users(db) == 1
    # The session's refresh token is stored (as a hash) for this user
    tokens = db.scalars(
        select(RefreshToken).where(RefreshToken.user_id == user.id)
    ).all()
    assert len(tokens) == 1
    assert tokens[0].token_hash != client.cookies[REFRESH_COOKIE]
    assert latest_code_row(db).consumed_at == clock.now


def test_verify_existing_user_creates_no_duplicate(
    client, clock, fake_email, db, make_user
):
    existing = make_user(email=EMAIL)
    code = request_code(client, fake_email)

    response = verify(client, code)

    assert response.status_code == 200
    assert response.json()["id"] == existing.id
    assert count_users(db) == 1


def test_wrong_code_is_400_and_counts_attempt(client, clock, fake_email, db):
    code = request_code(client, fake_email)

    response = verify(client, wrong_code(code))

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid or expired code"
    row = latest_code_row(db)
    assert row.attempts == 1
    assert row.consumed_at is None
    assert ACCESS_COOKIE not in client.cookies
    assert count_users(db) == 0


def test_fifth_wrong_guess_burns_code(client, clock, fake_email, db):
    code = request_code(client, fake_email)

    for _ in range(5):
        assert verify(client, wrong_code(code)).status_code == 400

    row = latest_code_row(db)
    assert row.attempts == 5
    assert row.consumed_at is not None
    response = verify(client, code)
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid or expired code"


def test_expired_code_is_400(client, clock, fake_email, db):
    code = request_code(client, fake_email)
    clock.advance(minutes=10, seconds=1)

    response = verify(client, code)

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid or expired code"
    assert count_users(db) == 0


def test_consumed_code_is_400(client, clock, fake_email):
    code = request_code(client, fake_email)
    assert verify(client, code).status_code == 200

    response = verify(client, code)

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid or expired code"


def test_stored_hash_is_not_raw_code(client, clock, fake_email, db):
    code = request_code(client, fake_email)

    row = latest_code_row(db)

    assert row.code_hash != code
    assert code not in row.code_hash
    assert row.code_hash == hash_code(EMAIL, code)


def test_verify_matches_email_case_insensitively(client, clock, fake_email):
    code = request_code(client, fake_email, email=" Me@Example.COM ")

    response = verify(client, code, email="me@example.com")

    assert response.status_code == 200
    assert response.json()["email"] == "me@example.com"


def test_verify_accepts_padded_code_with_whitespace(
    client, clock, fake_email, monkeypatch
):
    # Patch both the module and the router's imported name, whichever the
    # route calls. The leading zero proves the code stays a string.
    monkeypatch.setattr("app.auth.codes.generate_code", lambda: "012345")
    monkeypatch.setattr(
        "app.auth.router.generate_code", lambda: "012345", raising=False
    )
    assert request_code(client, fake_email) == "012345"

    response = verify(client, " 012345 ")

    assert response.status_code == 200
    assert response.json()["email"] == EMAIL


def test_verify_returns_existing_display_name(client, clock, fake_email, make_user):
    make_user(email=EMAIL, display_name="TroutBum")
    code = request_code(client, fake_email)

    response = verify(client, code)

    assert response.status_code == 200
    assert response.json()["displayName"] == "TroutBum"
