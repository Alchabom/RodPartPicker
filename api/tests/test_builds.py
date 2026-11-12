from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import update

from app.builds.models import Build
from app.parts.models import Reel, Rod


def test_create_build(client, signed_in, make_part):
    rod = make_part(Rod)

    response = client.post("/api/builds", json={"name": "My Build", "rodId": rod.id})

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "My Build"
    assert data["rodId"] == rod.id
    assert data["reelId"] is None
    assert data["id"] is not None
    assert data["createdAt"] is not None


def test_get_build(client, signed_in, make_part, make_build):
    build = make_build(user_id=signed_in["id"], rod_id=make_part(Rod).id)

    response = client.get(f"/api/builds/{build.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == build.id
    assert data["name"] == build.name
    assert data["rodId"] == build.rod_id
    assert data["reelId"] is None


def test_get_missing_build(client, signed_in):
    response = client.get("/api/builds/999999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Build not found"


def test_get_build_id_zero(client, signed_in):
    assert client.get("/api/builds/0").status_code == 422


def test_create_build_with_missing_part(client, signed_in):
    response = client.post("/api/builds", json={"name": "Ghost", "rodId": 999999})

    assert response.status_code == 400
    assert response.json()["detail"] == "Referenced part does not exist"


@pytest.mark.parametrize("name", ["", "   ", "x" * 121, None])
def test_create_build_invalid_name(client, signed_in, name):
    response = client.post("/api/builds", json={"name": name})

    assert response.status_code == 422
    assert "name" in response.json()["detail"][0]["loc"]


def test_list_orders_by_updated_at(client, signed_in, db, make_build):
    older = make_build(user_id=signed_in["id"])
    newer = make_build(user_id=signed_in["id"])
    db.execute(
        update(Build)
        .where(Build.id == older.id)
        .values(updated_at=datetime(2025, 1, 1))
    )
    db.execute(
        update(Build)
        .where(Build.id == newer.id)
        .values(updated_at=datetime(2025, 6, 1))
    )

    response = client.get("/api/builds")

    assert response.status_code == 200
    ids = [b["id"] for b in response.json()]
    assert ids.index(newer.id) < ids.index(older.id)


# ---------- Update and delete ----------


def test_update_build_replaces_all_fields(client, signed_in, make_part, make_build):
    build = make_build(user_id=signed_in["id"], rod_id=make_part(Rod).id)
    reel = make_part(Reel)

    response = client.put(
        f"/api/builds/{build.id}", json={"name": "Renamed", "reelId": reel.id}
    )

    assert response.status_code == 204
    data = client.get(f"/api/builds/{build.id}").json()
    assert data["name"] == "Renamed"
    assert data["reelId"] == reel.id
    assert data["rodId"] is None  # full replace: unset part IDs become null


def test_update_missing_build(client, signed_in):
    response = client.put("/api/builds/999999", json={"name": "Nope"})

    assert response.status_code == 404


def test_update_build_with_missing_part(client, signed_in, make_build):
    build = make_build(user_id=signed_in["id"])

    response = client.put(
        f"/api/builds/{build.id}", json={"name": "Ghost", "rodId": 999999}
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Referenced part does not exist"


def test_delete_build(client, signed_in, make_build):
    build = make_build(user_id=signed_in["id"])

    response = client.delete(f"/api/builds/{build.id}")

    assert response.status_code == 204
    assert client.get(f"/api/builds/{build.id}").status_code == 404


def test_delete_missing_build(client, signed_in):
    assert client.delete("/api/builds/999999").status_code == 404


# ---------- Ownership ----------


@pytest.mark.parametrize(
    "method, path",
    [
        ("get", "/api/builds"),
        ("post", "/api/builds"),
        ("get", "/api/builds/1"),
        ("put", "/api/builds/1"),
        ("delete", "/api/builds/1"),
    ],
)
def test_builds_require_sign_in(client, method, path):
    kwargs = {"json": {"name": "x"}} if method in ("post", "put") else {}
    assert getattr(client, method)(path, **kwargs).status_code == 401


def test_create_build_owned_by_caller(client, signed_in, db, make_user):
    other = make_user()
    response = client.post("/api/builds", json={"name": "Mine", "userId": other.id})
    assert response.status_code == 201
    assert "userId" not in response.json()
    assert db.get(Build, response.json()["id"]).user_id == signed_in["id"]


def test_list_only_my_builds_newest_first(client, signed_in, make_build, make_user):
    old = make_build(user_id=signed_in["id"], updated_at=datetime(2026, 1, 1))
    new = make_build(user_id=signed_in["id"], updated_at=datetime(2026, 2, 1))
    tie = make_build(user_id=signed_in["id"], updated_at=datetime(2026, 2, 1))
    make_build(user_id=make_user().id)
    ids = [b["id"] for b in client.get("/api/builds").json()]
    assert ids == [tie.id, new.id, old.id]


@pytest.mark.parametrize("method", ["get", "put", "delete"])
def test_other_users_build_is_not_found(
    client, signed_in, db, make_build, make_user, method
):
    theirs = make_build(user_id=make_user().id, name="Theirs")
    db.commit()  # factories only flush; commit so the rollback below drops only the route's changes
    kwargs = {"json": {"name": "Stolen"}} if method == "put" else {}
    response = getattr(client, method)(f"/api/builds/{theirs.id}", **kwargs)
    assert response.status_code == 404
    assert response.json()["detail"] == "Build not found"
    db.rollback()
    assert db.get(Build, theirs.id).name == "Theirs"


def test_build_timestamps_are_utc(client, signed_in):
    response = client.post("/api/builds", json={"name": "Clock check"})
    updated = datetime.fromisoformat(response.json()["updatedAt"])
    assert updated.tzinfo is None  # naive UTC, as the frontend expects
    assert abs(updated - datetime.now(UTC).replace(tzinfo=None)) < timedelta(minutes=1)
