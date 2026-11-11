"""GET and PUT /api/auth/me: the current user and display names (Task 3.3)."""

import base64
import json

import pytest
from sqlalchemy import select

from app.auth.cookies import ACCESS_COOKIE
from app.auth.models import User

URL = "/api/auth/me"


def tamper(token):
    """Swap the JWT's payload for one naming another user, keeping the signature."""
    header, payload, signature = token.split(".")
    claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
    claims["sub"] = str(int(claims["sub"]) + 1)
    forged = base64.urlsafe_b64encode(json.dumps(claims).encode()).rstrip(b"=")
    return f"{header}.{forged.decode()}.{signature}"


def test_me_returns_user(client, fake_email, login):
    user = login(client, fake_email)

    response = client.get(URL)

    assert response.status_code == 200
    assert response.json() == {
        "id": user["id"],
        "email": "angler@example.com",
        "displayName": None,
    }


def test_me_without_cookie_is_401(client):
    assert client.get(URL).status_code == 401


def test_me_with_expired_access_token_is_401(client, clock, fake_email, login):
    login(client, fake_email)
    clock.advance(minutes=16)

    assert client.get(URL).status_code == 401


def test_me_with_tampered_token_is_401(client, fake_email, login):
    login(client, fake_email)
    tampered = tamper(client.cookies[ACCESS_COOKIE])
    client.cookies.clear()

    response = client.get(URL, headers={"Cookie": f"{ACCESS_COOKIE}={tampered}"})

    assert response.status_code == 401


def test_set_display_name(client, fake_email, login, db):
    user = login(client, fake_email)

    response = client.put(URL, json={"displayName": "TroutBum"})

    assert response.status_code == 200
    assert response.json() == {
        "id": user["id"],
        "email": "angler@example.com",
        "displayName": "TroutBum",
    }
    db.rollback()  # drop anything the route didn't commit, then re-read
    stored = db.scalars(select(User).where(User.id == user["id"])).one()
    assert stored.display_name == "TroutBum"
    assert client.get(URL).json()["displayName"] == "TroutBum"


def test_display_name_taken_ignoring_case_is_409(client, fake_email, login, make_user):
    make_user(display_name="TroutBum")
    login(client, fake_email)

    response = client.put(URL, json={"displayName": "troutbum"})

    assert response.status_code == 409
    assert response.json()["detail"] == "Display name taken"
    assert client.get(URL).json()["displayName"] is None


@pytest.mark.parametrize("name", ["ab", "bad name!"])
def test_bad_display_name_is_422(client, fake_email, login, name):
    login(client, fake_email)

    response = client.put(URL, json={"displayName": name})

    assert response.status_code == 422


def test_set_display_name_requires_login(client):
    response = client.put(URL, json={"displayName": "TroutBum"})

    assert response.status_code == 401
