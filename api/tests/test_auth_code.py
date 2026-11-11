"""POST /api/auth/code: sending a login code, and its rate limits (Task 3.1)."""

from datetime import timedelta

import pytest
from sqlalchemy import select

from app.auth.codes import CODE_TTL, hash_code
from app.auth.models import LoginCode

URL = "/api/auth/code"
VERIFY_URL = "/api/auth/verify"


def discard_uncommitted(db):
    """Drop whatever the route changed but didn't commit, then re-read.

    The route shares the test's session, so without this an uncommitted
    change would still be visible and a missing db.commit() would go unseen.
    """
    db.rollback()


def codes_for(db, email):
    discard_uncommitted(db)
    return db.scalars(
        select(LoginCode).where(LoginCode.email == email).order_by(LoginCode.id)
    ).all()


def test_request_code_returns_202_for_new_and_existing_email(
    client, clock, fake_email, make_user
):
    make_user(email="existing@example.com")

    new = client.post(URL, json={"email": "new@example.com"})
    existing = client.post(URL, json={"email": "existing@example.com"})

    # Same answer either way, so the response never reveals who has an account
    assert new.status_code == 202
    assert new.json() == {}
    assert existing.status_code == 202
    assert existing.json() == {}
    assert [to for to, _ in fake_email.sent] == [
        "new@example.com",
        "existing@example.com",
    ]


def test_request_code_normalizes_email(client, clock, fake_email, db):
    response = client.post(URL, json={"email": " Me@X.COM "})

    assert response.status_code == 202
    rows = codes_for(db, "me@x.com")
    assert len(rows) == 1
    assert rows[0].email == "me@x.com"
    assert rows[0].expires_at == clock.now + CODE_TTL
    assert fake_email.sent[0][0] == "me@x.com"


def test_new_code_consumes_previous(client, clock, fake_email, db):
    client.post(URL, json={"email": "angler@example.com"})
    clock.advance(seconds=61)

    response = client.post(URL, json={"email": "angler@example.com"})

    assert response.status_code == 202
    first, second = codes_for(db, "angler@example.com")
    assert first.consumed_at == clock.now
    assert second.consumed_at is None


def test_cooldown_returns_429_with_retry_after(client, clock, fake_email):
    client.post(URL, json={"email": "angler@example.com"})
    clock.advance(seconds=20)

    response = client.post(URL, json={"email": "angler@example.com"})

    assert response.status_code == 429
    assert response.headers["Retry-After"] == "40"
    assert len(fake_email.sent) == 1


def test_sixth_code_in_an_hour_is_limited(client, clock, fake_email):
    first_sent_at = clock.now
    for _ in range(5):
        response = client.post(URL, json={"email": "angler@example.com"})
        assert response.status_code == 202
        clock.advance(seconds=61)  # past the 60 s cooldown each time

    response = client.post(URL, json={"email": "angler@example.com"})

    assert response.status_code == 429
    # The wait ends when the oldest code in the window turns one hour old
    wait = first_sent_at + timedelta(hours=1) - clock.now
    assert response.headers["Retry-After"] == str(int(wait.total_seconds()))
    assert len(fake_email.sent) == 5


def test_twenty_first_code_per_ip_is_limited(client, clock, fake_email):
    for i in range(20):
        response = client.post(URL, json={"email": f"angler{i}@example.com"})
        assert response.status_code == 202

    response = client.post(URL, json={"email": "angler20@example.com"})

    assert response.status_code == 429
    # All 20 were sent just now, so the oldest turns one hour old in an hour
    assert response.headers["Retry-After"] == "3600"
    assert len(fake_email.sent) == 20


def test_send_failure_returns_503_and_stores_nothing(client, clock, fake_email, db):
    fake_email.fail = True

    response = client.post(URL, json={"email": "angler@example.com"})

    assert response.status_code == 503
    assert response.json()["detail"] == "Couldn't send the code, try again"
    assert codes_for(db, "angler@example.com") == []

    # A failed send doesn't count against the rate limit: no cooldown follows
    fake_email.fail = False
    assert client.post(URL, json={"email": "angler@example.com"}).status_code == 202


def test_send_failure_keeps_the_previous_code(client, clock, fake_email, db):
    client.post(URL, json={"email": "angler@example.com"})
    first_code = fake_email.last_code_for("angler@example.com")
    clock.advance(seconds=61)
    fake_email.fail = True

    response = client.post(URL, json={"email": "angler@example.com"})

    assert response.status_code == 503
    # The rollback undid "consume older codes", so the first code still works
    (first,) = codes_for(db, "angler@example.com")
    assert first.consumed_at is None
    verified = client.post(
        VERIFY_URL, json={"email": "angler@example.com", "code": first_code}
    )
    assert verified.status_code == 200


def test_old_codes_are_deleted(client, clock, fake_email, db):
    def insert_code(email, age):
        created_at = clock.now - age
        row = LoginCode(
            email=email,
            code_hash=hash_code(email, "123456"),
            attempts=0,
            requester_ip="10.0.0.9",
            expires_at=created_at + CODE_TTL,
            consumed_at=None,
            created_at=created_at,
        )
        db.add(row)
        db.flush()
        return row.id

    old_id = insert_code("old@example.com", timedelta(hours=25))
    recent_id = insert_code("recent@example.com", timedelta(hours=23))

    response = client.post(URL, json={"email": "angler@example.com"})

    assert response.status_code == 202
    discard_uncommitted(db)
    assert db.get(LoginCode, old_id) is None
    # Only rows past 24 h go
    assert db.get(LoginCode, recent_id) is not None


@pytest.mark.parametrize("email", ["not-an-email", "", 42])
def test_invalid_email_is_422(client, clock, fake_email, email):
    response = client.post(URL, json={"email": email})

    assert response.status_code == 422
    assert fake_email.sent == []
