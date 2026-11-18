from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event, func, select

from app.builds.models import Build
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


# ---------- Public routes ----------

LIST = "/api/published"


def priced(make_part, make_published, prices, **columns):
    """Publish a build whose five parts cost `prices` (None leaves it unset)."""
    parts = {}
    for column, model, price in zip(
        PART_COLUMNS, [Rod, Reel, FlyLine, Leader, Tippet], prices, strict=True
    ):
        parts[column] = make_part(model, price=price).id
    return make_published(**{**parts, **columns})


def ids(response):
    return [item["id"] for item in response.json()["items"]]


def test_list_newest_first_with_id_tiebreak(client, make_published):
    old = make_published(published_at=datetime(2026, 1, 1))
    new = make_published(published_at=datetime(2026, 2, 1))
    tie = make_published(published_at=datetime(2026, 2, 1))

    response = client.get(LIST)

    assert response.status_code == 200
    assert ids(response) == [tie.id, new.id, old.id]


def test_list_pages_of_20(client, make_published):
    for _ in range(21):
        make_published()

    first = client.get(LIST).json()
    second = client.get(LIST, params={"page": 2}).json()

    assert len(first["items"]) == 20
    assert first["total"] == 21
    assert first["pageSize"] == 20
    assert first["page"] == 1
    assert len(second["items"]) == 1
    assert second["page"] == 2


def test_page_past_the_end_is_empty(client, make_published):
    make_published()
    make_published()

    response = client.get(LIST, params={"page": 99})

    assert response.status_code == 200
    assert response.json()["items"] == []
    assert response.json()["total"] == 2
    assert response.json()["page"] == 99


def test_filter_by_weight(client, make_part, make_published):
    five = make_published(rod_id=make_part(Rod, line_weight=5).id)
    make_published(rod_id=make_part(Rod, line_weight=3).id)

    response = client.get(LIST, params={"weight": 5})

    assert ids(response) == [five.id]
    assert response.json()["total"] == 1


def test_weight_filter_uses_the_rod_not_the_line(client, make_part, make_published):
    build = make_published(
        rod_id=make_part(Rod, line_weight=5).id,
        fly_line_id=make_part(FlyLine, line_weight=9).id,
    )

    assert ids(client.get(LIST, params={"weight": 5})) == [build.id]
    assert ids(client.get(LIST, params={"weight": 9})) == []


def test_max_price_is_inclusive_with_cents(client, make_part, make_published):
    cheap = priced(make_part, make_published, [100, 100, 100, 100, "99.99"])
    exact = priced(make_part, make_published, [100, 100, 100, 100, 100])

    below = client.get(LIST, params={"maxPrice": "499.99"})
    both = client.get(LIST, params={"maxPrice": 500})

    assert ids(below) == [cheap.id]
    assert sorted(ids(both)) == sorted([cheap.id, exact.id])
    assert below.json()["items"][0]["totalPrice"] == 499.99
    assert both.json()["items"][0]["totalPrice"] == 500.0


def test_total_counts_missing_part_as_zero(client, db, make_part, make_published):
    no_leader_price = priced(make_part, make_published, [100, 50, 25, None, 5])
    reel = make_part(Reel, price=50)
    no_reel = priced(make_part, make_published, [100, 1, 25, 10, 5], reel_id=reel.id)
    db.delete(reel)
    db.flush()
    db.expire_all()

    items = {i["id"]: i for i in client.get(LIST).json()["items"]}

    assert items[no_leader_price.id]["totalPrice"] == 180
    assert items[no_reel.id]["totalPrice"] == 140
    assert ids(client.get(LIST, params={"maxPrice": 140})) == [no_reel.id]


@pytest.mark.parametrize(
    "params",
    [
        {"page": 0},
        {"page": 10001},
        {"page": 10000000000000000000},
        {"weight": 0},
        {"weight": 16},
        {"weight": "abc"},
        {"maxPrice": -1},
        {"maxPrice": "1 OR 1=1"},
    ],
)
def test_bad_list_params_are_422(client, params):
    assert client.get(LIST, params=params).status_code == 422


def test_summary_shape(client, make_part, make_published, make_user):
    author = make_user(display_name="Rivers")
    rod = make_part(Rod, line_weight=6)
    make_published(user_id=author.id, rod_id=rod.id)

    (item,) = client.get(LIST).json()["items"]

    assert set(item) == {
        "id",
        "title",
        "author",
        "rod",
        "totalPrice",
        "publishedAt",
    }
    assert item["author"] == "Rivers"
    assert item["rod"] == {
        "brand": rod.brand.name,
        "name": rod.name,
        "lineWeight": 6,
        "imageUrl": None,
    }


def test_list_rod_has_image_url(client, make_part, make_published):
    rod = make_part(Rod, image_path="rods/x.webp")
    make_published(rod_id=rod.id)

    (item,) = client.get(LIST).json()["items"]

    assert item["rod"]["imageUrl"] == "/parts/rods/x.webp"


def test_detail_includes_links_and_images(client, make_part, make_published):
    rod = make_part(
        Rod, purchase_url="https://shop.example/r", image_path="rods/x.webp"
    )
    reel = make_part(Reel, image_path="reels/y.webp")
    tippet = make_part(Tippet, purchase_url="https://shop.example/t")
    published = make_published(rod_id=rod.id, reel_id=reel.id, tippet_id=tippet.id)

    parts = client.get(f"{LIST}/{published.id}").json()["parts"]

    assert parts["rod"]["imageUrl"] == "/parts/rods/x.webp"
    assert parts["rod"]["purchaseUrl"] == "https://shop.example/r"
    assert parts["reel"]["imageUrl"] == "/parts/reels/y.webp"
    assert parts["tippet"]["purchaseUrl"] == "https://shop.example/t"
    assert "imageUrl" not in parts["tippet"]
    assert parts["line"]["purchaseUrl"] is None


def test_detail(client, make_part, make_published):
    published = priced(
        make_part, make_published, [100, 50, 25, 10, 5], writeup="Line one\nTwo"
    )

    response = client.get(f"{LIST}/{published.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == published.id
    assert data["title"] == published.title
    assert data["author"] == published.user.display_name
    assert data["writeup"] == "Line one\nTwo"
    assert data["totalPrice"] == 190
    assert data["publishedAt"] is not None
    assert data["updatedAt"] is not None
    assert data["rod"]["lineWeight"] == published.rod.line_weight
    assert set(data["parts"]) == {"rod", "reel", "line", "leader", "tippet"}
    assert data["parts"]["line"] == {
        "id": published.fly_line.id,
        "brand": published.fly_line.brand.name,
        "name": published.fly_line.name,
        "price": 25,
        "purchaseUrl": None,
    }
    for slot, part in data["parts"].items():
        keys = {"id", "brand", "name", "price", "purchaseUrl"}
        if slot in ("rod", "reel"):
            keys.add("imageUrl")
        assert set(part) == keys


def test_detail_removed_part_is_null(client, db, make_part, make_published):
    rod = make_part(Rod, line_weight=5, price=100)
    published = priced(make_part, make_published, [0, 50, 25, 10, 5], rod_id=rod.id)
    db.delete(rod)
    db.flush()
    db.expire_all()

    data = client.get(f"{LIST}/{published.id}").json()

    assert data["parts"]["rod"] is None
    assert data["rod"] is None
    assert data["totalPrice"] == 90
    assert ids(client.get(LIST, params={"weight": 5})) == []


def test_detail_unknown_is_404(client):
    response = client.get(f"{LIST}/999999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Published build not found"


def test_public_routes_hide_private_ids(client, make_published):
    published = make_published()

    for url in (LIST, f"{LIST}/{published.id}"):
        text = client.get(url).text
        for secret in (
            "userId",
            "sourceBuildId",
            "user_id",
            "source_build_id",
            "@example.com",
        ):
            assert secret not in text


def test_public_routes_need_no_sign_in(client, make_published):
    published = make_published()

    assert client.get(LIST).status_code == 200
    assert client.get(f"{LIST}/{published.id}").status_code == 200


def test_sql_injection_text_is_stored_verbatim(client, named, make_full_build):
    build = make_full_build(named["id"])
    title = "x'); DROP TABLE builds; --"

    created = client.put(URL.format(build.id), json={**BODY, "title": title})

    assert created.status_code == 201
    assert client.get(f"{LIST}/{created.json()['id']}").json()["title"] == title
    builds = client.get("/api/builds")
    assert builds.status_code == 200
    assert build.id in [b["id"] for b in builds.json()]


def test_script_text_is_returned_verbatim(client, named, make_full_build):
    build = make_full_build(named["id"])
    writeup = "<script>alert(1)</script>"

    created = client.put(URL.format(build.id), json={**BODY, "writeup": writeup})

    assert client.get(f"{LIST}/{created.json()['id']}").json()["writeup"] == writeup


def count_statements(engine, client, url):
    statements = []

    def record(conn, cursor, statement, *args):
        statements.append(statement)

    event.listen(engine, "before_cursor_execute", record)
    try:
        assert client.get(url).status_code == 200
    finally:
        event.remove(engine, "before_cursor_execute", record)
    return len(statements)


def test_list_query_count_does_not_grow_with_authors(engine, client, make_published):
    for _ in range(2):
        make_published()
    with_two = count_statements(engine, client, LIST)
    for _ in range(3):
        make_published()

    assert count_statements(engine, client, LIST) == with_two
