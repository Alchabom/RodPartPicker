"""The Origin middleware: writes under /api need the app's own Origin (Task 3.4)."""

import pytest
from fastapi.testclient import TestClient

from app.db import get_db
from app.main import app


@pytest.fixture
def bare_client(db):
    """A client with no default headers, so no Origin, on the test database."""
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.pop(get_db, None)


def test_foreign_origin_is_403(client, fake_email):
    response = client.post(
        "/api/auth/code",
        json={"email": "angler@example.com"},
        headers={"Origin": "https://evil.example"},
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "Origin not allowed"}
    assert fake_email.sent == []


def test_missing_origin_is_403(bare_client, fake_email):
    response = bare_client.post("/api/auth/code", json={"email": "angler@example.com"})

    assert response.status_code == 403
    assert response.json() == {"detail": "Origin not allowed"}
    assert fake_email.sent == []


def test_get_without_origin_is_allowed(bare_client):
    response = bare_client.get("/api/health")

    assert response.status_code != 403
