from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import pytest
from sqlalchemy import select

from app.auth.models import RefreshToken
from app.auth.tokens import (
    decode_access_token,
    hash_refresh_token,
    issue_access_token,
    issue_refresh_token,
)
from app.config import settings

NOW = datetime(2026, 1, 1, 12, 0)
# A valid exp claim, 10 minutes after NOW
FUTURE_EXP = int(NOW.replace(tzinfo=UTC).timestamp()) + 600


def test_access_token_round_trips():
    assert decode_access_token(issue_access_token(7, NOW), NOW) == 7


def test_access_token_expires():
    token = issue_access_token(7, NOW)
    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token(token, NOW + timedelta(minutes=15, seconds=1))


def test_access_token_exp_is_utc_plus_15_minutes():
    # Round-tripping can't catch a local-time .timestamp() bug, because encode
    # and decode would drift together. Pin the claim itself.
    token = issue_access_token(7, NOW)
    claims = jwt.decode(token, options={"verify_signature": False})
    assert claims["exp"] == int(NOW.replace(tzinfo=UTC).timestamp()) + 900
    assert claims["sub"] == "7"


def test_access_token_expires_exactly_at_15_minutes():
    token = issue_access_token(7, NOW)
    assert decode_access_token(token, NOW + timedelta(minutes=14, seconds=59)) == 7
    with pytest.raises(jwt.ExpiredSignatureError):
        decode_access_token(token, NOW + timedelta(minutes=15))


@pytest.mark.parametrize(
    "claims",
    [
        {"exp": FUTURE_EXP},  # no sub
        {"sub": "7"},  # no exp
        {"sub": "abc", "exp": FUTURE_EXP},  # sub isn't a user ID
        {"sub": "7", "exp": "soon"},  # exp isn't a number
        {"sub": "7", "exp": True},  # bool passes isinstance(int)
    ],
    ids=["no-sub", "no-exp", "bad-sub", "bad-exp", "bool-exp"],
)
def test_access_token_bad_claims(claims):
    # Signed with the real secret: only the claims are wrong. Every case must be
    # InvalidTokenError, so get_current_user_id answers 401 instead of 500.
    token = jwt.encode(claims, settings.JWT_SECRET, algorithm="HS256")
    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token(token, NOW)


def test_access_token_tampered():
    header, payload, signature = issue_access_token(7, NOW).split(".")
    # A middle character: the last one's low bits can be padding, so changing
    # it may decode to the same signature bytes
    i = len(signature) // 2
    swapped = "A" if signature[i] != "A" else "B"
    tampered = signature[:i] + swapped + signature[i + 1 :]
    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token(f"{header}.{payload}.{tampered}", NOW)


def test_access_token_alg_none():
    token = jwt.encode({"sub": "7", "exp": FUTURE_EXP}, None, algorithm="none")
    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token(token, NOW)


def test_access_token_hs512():
    token = jwt.encode(
        {"sub": "7", "exp": FUTURE_EXP}, settings.JWT_SECRET, algorithm="HS512"
    )
    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token(token, NOW)


def test_issue_refresh_token_stores_only_hash(db, make_user):
    user = make_user()
    family_id = str(uuid4())

    raw = issue_refresh_token(db, user.id, family_id, NOW)

    row = db.scalars(select(RefreshToken).where(RefreshToken.user_id == user.id)).one()
    assert row.token_hash == hash_refresh_token(raw)
    assert row.token_hash != raw
    assert row.family_id == family_id
    assert row.expires_at == NOW + timedelta(days=30)
    assert row.created_at == NOW
