from datetime import datetime

import pytest
from sqlalchemy import update

from app.builds.models import Build
from app.parts.models import Reel, Rod


def test_create_build(client, make_part):
    rod = make_part(Rod)

    response = client.post("/api/builds", json={"name": "My Build", "rodId": rod.id})

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "My Build"
    assert data["rodId"] == rod.id
    assert data["reelId"] is None
    assert data["id"] is not None
    assert data["createdAt"] is not None


def test_get_build(client, make_part, make_build):
    build = make_build(rod_id=make_part(Rod).id)

    response = client.get(f"/api/builds/{build.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == build.id
    assert data["name"] == build.name
    assert data["rodId"] == build.rod_id
    assert data["reelId"] is None


def test_get_missing_build(client):
    response = client.get("/api/builds/999999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Build not found"


def test_get_build_id_zero(client):
    assert client.get("/api/builds/0").status_code == 422


def test_create_build_with_missing_part(client):
    response = client.post("/api/builds", json={"name": "Ghost", "rodId": 999999})

    assert response.status_code == 400
    assert response.json()["detail"] == "Referenced part does not exist"


@pytest.mark.parametrize("name", ["", "   ", "x" * 121, None])
def test_create_build_invalid_name(client, name):
    response = client.post("/api/builds", json={"name": name})

    assert response.status_code == 422
    assert "name" in response.json()["detail"][0]["loc"]


def test_list_orders_by_updated_at(client, db, make_build):
    older = make_build()
    newer = make_build()
    db.execute(
        update(Build).where(Build.id == older.id).values(updated_at=datetime(2025, 1, 1))
    )
    db.execute(
        update(Build).where(Build.id == newer.id).values(updated_at=datetime(2025, 6, 1))
    )

    response = client.get("/api/builds")

    assert response.status_code == 200
    ids = [b["id"] for b in response.json()]
    assert ids.index(newer.id) < ids.index(older.id)


# ---------- Update and delete ----------


def test_update_build_replaces_all_fields(client, make_part, make_build):
    build = make_build(rod_id=make_part(Rod).id)
    reel = make_part(Reel)

    response = client.put(
        f"/api/builds/{build.id}", json={"name": "Renamed", "reelId": reel.id}
    )

    assert response.status_code == 204
    data = client.get(f"/api/builds/{build.id}").json()
    assert data["name"] == "Renamed"
    assert data["reelId"] == reel.id
    assert data["rodId"] is None  # full replace: unset part IDs become null


def test_update_missing_build(client):
    response = client.put("/api/builds/999999", json={"name": "Nope"})

    assert response.status_code == 404


def test_update_build_with_missing_part(client, make_build):
    build = make_build()

    response = client.put(
        f"/api/builds/{build.id}", json={"name": "Ghost", "rodId": 999999}
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Referenced part does not exist"


def test_delete_build(client, make_build):
    build = make_build()

    response = client.delete(f"/api/builds/{build.id}")

    assert response.status_code == 204
    assert client.get(f"/api/builds/{build.id}").status_code == 404


def test_delete_missing_build(client):
    assert client.delete("/api/builds/999999").status_code == 404
