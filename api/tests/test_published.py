from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.builds.models import Build
from app.config import settings
from app.db import get_db
from app.main import app
from app.parts.models import FlyLine, Leader, Reel, Rod, Tippet
from app.published.models import PublishedBuild

URL = "/api/builds/{}/published"
PART_COLUMNS = ["rod_id", "reel_id", "fly_line_id", "leader_id", "tippet_id"]
BODY = {"title": "Creek setup", "writeup": "Small water."}


@pytest.fixture
def named(client, fake_email, login):
    """Sign the client in with a display name; returns the user JSON."""
    login(client, fake_email)
    response = client.put("/api/auth/me", json={"displayName": "TroutBum"})
    assert response.status_code == 200, response.text
    return response.json()


@pytest.fixture
def make_full_build(make_build, make_part):
    def make(user_id, **overrides):
        parts = {
            "rod_id": make_part(Rod).id,
            "reel_id": make_part(Reel).id,
            "fly_line_id": make_part(FlyLine).id,
            "leader_id": make_part(Leader).id,
            "tippet_id": make_part(Tippet).id,
        }
        return make_build(user_id=user_id, **{**parts, **overrides})

    return make


@pytest.fixture
def make_published(db, make_user, make_part):
    count = 0

    def make(**columns):
        nonlocal count
        count += 1
        if "user_id" not in columns and "user" not in columns:
            columns["user_id"] = make_user(display_name=f"Author {count}").id
        for column, model in zip(
            PART_COLUMNS, [Rod, Reel, FlyLine, Leader, Tippet], strict=True
        ):
            if column not in columns:
                columns[column] = make_part(model).id
        published = PublishedBuild(
            **{"title": f"Test Publish {count}", "writeup": "Write-up", **columns}
        )
        db.add(published)
        db.flush()
        return published

    return make


@pytest.fixture
def bare_client(db):
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.pop(get_db, None)


def published_rows(db, build_id):
    db.rollback()
    return db.scalars(
        select(PublishedBuild).where(PublishedBuild.source_build_id == build_id)
    ).all()


def test_publish_creates_snapshot(client, db, named, make_full_build):
    build = make_full_build(named["id"])

    response = client.put(URL.format(build.id), json=BODY)

    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Creek setup"
    assert data["writeup"] == "Small water."
    assert data["id"] is not None
    assert data["updatedAt"] is not None
    assert "userId" not in data
    assert "sourceBuildId" not in data
    (row,) = published_rows(db, build.id)
    assert [getattr(row, c) for c in PART_COLUMNS] == [
        getattr(build, c) for c in PART_COLUMNS
    ]
    assert row.user_id == named["id"]
    assert row.source_build_id == build.id


def test_publish_again_updates_and_keeps_published_at(
    client, db, named, make_full_build, make_part
):
    build = make_full_build(named["id"])
    assert client.put(URL.format(build.id), json=BODY).status_code == 201
    (row,) = published_rows(db, build.id)
    row.published_at = datetime(2026, 1, 1)
    new_reel = make_part(Reel)
    build.reel_id = new_reel.id
    db.commit()

    response = client.put(URL.format(build.id), json={**BODY, "title": "New title"})

    assert response.status_code == 200
    (row,) = published_rows(db, build.id)
    assert row.title == "New title"
    assert row.reel_id == new_reel.id
    assert row.published_at == datetime(2026, 1, 1)


def test_editing_saved_build_leaves_snapshot(
    client, db, named, make_full_build, make_part
):
    build = make_full_build(named["id"])
    old_rod_id = build.rod_id
    assert client.put(URL.format(build.id), json=BODY).status_code == 201
    new_rod = make_part(Rod)

    response = client.put(
        f"/api/builds/{build.id}", json={"name": build.name, "rodId": new_rod.id}
    )

    assert response.status_code == 204
    (row,) = published_rows(db, build.id)
    assert row.rod_id == old_rod_id


@pytest.mark.parametrize("column", PART_COLUMNS)
def test_publish_missing_part_is_400(client, db, named, make_full_build, column):
    build = make_full_build(named["id"], **{column: None})

    response = client.put(URL.format(build.id), json=BODY)

    assert response.status_code == 400
    assert response.json()["detail"] == "Add all five parts before publishing"
    assert published_rows(db, build.id) == []


def test_publish_without_display_name_is_409(client, db, signed_in, make_full_build):
    build = make_full_build(signed_in["id"])

    response = client.put(URL.format(build.id), json=BODY)

    assert response.status_code == 409
    assert response.json()["detail"] == "Choose a display name first"
    assert published_rows(db, build.id) == []


@pytest.mark.parametrize(
    "body",
    [
        {"title": "ab", "writeup": "ok"},
        {"title": "x" * 81, "writeup": "ok"},
        {"title": "Creek setup", "writeup": ""},
        {"title": "Creek setup", "writeup": "x" * 4001},
    ],
)
def test_publish_text_limits_are_422(client, named, make_full_build, body):
    build = make_full_build(named["id"])

    assert client.put(URL.format(build.id), json=body).status_code == 422


def test_publish_text_at_limits_is_201(client, named, make_full_build):
    build = make_full_build(named["id"])

    response = client.put(
        URL.format(build.id), json={"title": "x" * 80, "writeup": "x" * 4000}
    )

    assert response.status_code == 201


@pytest.mark.parametrize(
    "body",
    [
        {"title": "   ", "writeup": "ok"},
        {"title": "Creek setup", "writeup": "  \n "},
    ],
)
def test_whitespace_only_text_is_422(client, named, make_full_build, body):
    build = make_full_build(named["id"])

    assert client.put(URL.format(build.id), json=body).status_code == 422


def test_get_my_published(client, named, make_full_build):
    build = make_full_build(named["id"])

    missing = client.get(URL.format(build.id))
    assert missing.status_code == 404
    assert missing.json()["detail"] == "Not published"

    created = client.put(URL.format(build.id), json=BODY).json()
    response = client.get(URL.format(build.id))

    assert response.status_code == 200
    assert response.json() == created


def test_unpublish(client, db, named, make_full_build):
    build = make_full_build(named["id"])
    client.put(URL.format(build.id), json=BODY)

    response = client.delete(URL.format(build.id))

    assert response.status_code == 204
    assert published_rows(db, build.id) == []
    again = client.delete(URL.format(build.id))
    assert again.status_code == 404
    assert again.json()["detail"] == "Not published"


@pytest.mark.parametrize("method", ["get", "put", "delete"])
def test_other_users_build_is_404_on_owner_routes(
    client, db, named, make_user, make_full_build, make_published, method
):
    other = make_user(display_name="Other")
    build = make_full_build(other.id)
    published = make_published(user_id=other.id, source_build_id=build.id)
    db.commit()

    response = getattr(client, method)(
        URL.format(build.id), **({"json": BODY} if method == "put" else {})
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Build not found"
    db.rollback()
    row = db.get(PublishedBuild, published.id)
    assert row is not None
    assert row.title == published.title


@pytest.mark.parametrize("method", ["get", "put", "delete"])
def test_owner_routes_require_sign_in(client, method):
    response = getattr(client, method)(
        URL.format(1), **({"json": BODY} if method == "put" else {})
    )

    assert response.status_code == 401


@pytest.mark.parametrize("method", ["put", "delete"])
def test_owner_writes_need_origin(bare_client, method):
    response = getattr(bare_client, method)(
        URL.format(1), **({"json": BODY} if method == "put" else {})
    )

    assert response.status_code == 403
    assert settings.APP_ORIGIN  # the header the client left out


def test_deleting_saved_build_keeps_published(client, db, named, make_full_build):
    build = make_full_build(named["id"])
    published_id = client.put(URL.format(build.id), json=BODY).json()["id"]

    assert client.delete(f"/api/builds/{build.id}").status_code == 204

    db.rollback()
    row = db.get(PublishedBuild, published_id)
    assert row is not None
    assert row.source_build_id is None
    assert (
        db.scalar(select(func.count()).select_from(Build).where(Build.id == build.id))
        == 0
    )


def test_deleting_user_deletes_published(db, make_published):
    published = make_published()
    published_id = published.id
    user = published.user

    db.delete(user)
    db.flush()
    db.expire_all()

    assert db.get(PublishedBuild, published_id) is None
