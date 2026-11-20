from decimal import Decimal

import pytest
from sqlalchemy import event

from app.parts.models import FlyLine, Leader, Reel, Rod, Tippet


@pytest.mark.parametrize("category", ["rod", "reel", "line", "leader", "tippet"])
def test_each_category_returns_a_list(client, category):
    response = client.get(f"/api/parts/{category}")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_unknown_category_is_404(client):
    assert client.get("/api/parts/boat").status_code == 404


def find(rows, part_id):
    # The test DB also holds the seed catalog, so look up our row by id
    return next(row for row in rows if row["id"] == part_id)


def test_rod_shape(client, make_brand, make_part):
    rod = make_part(Rod, brand=make_brand("Shape Co"), pieces=None)

    row = find(client.get("/api/parts/rod").json(), rod.id)

    assert row == {
        "id": rod.id,
        "brand": "Shape Co",
        "model": "Test Rod",
        "action": "fast",
        "water": "fresh",
        "lineWeight": 5,
        "lengthIn": 108,
        "pieces": None,
        "price": 500.0,
        "purchaseUrl": None,
        "imageUrl": None,
        "seriesId": rod.series_id,
        "sizeCode": None,
    }


def test_prices_are_json_numbers(client, make_part):
    reel = make_part(Reel, price=Decimal("129.99"))

    row = find(client.get("/api/parts/reel").json(), reel.id)

    assert row["price"] == 129.99  # a number, not the string "129.99"


def test_line_shape(client, make_part):
    line = make_part(FlyLine, type="sink_tip", sink_rate_ips=Decimal("2.5"))

    row = find(client.get("/api/parts/line").json(), line.id)

    assert row["type"] == "sink_tip"
    assert row["sinkRateIps"] == 2.5
    assert row["headWeightGrains"] == 140


def test_leader_without_x_size(client, make_part):
    leader = make_part(Leader, x_size_id=None)

    row = find(client.get("/api/parts/leader").json(), leader.id)

    assert row["xSize"] is None
    assert row["price"] is None
    assert row["lengthFt"] == 9.0


def test_tippet_shows_x_size_label(client, make_part):
    tippet = make_part(Tippet)

    row = find(client.get("/api/parts/tippet").json(), tippet.id)

    assert row["xSize"] == "5X"
    assert row["spoolYards"] == 30


def test_rods_ordered_by_brand_then_name(client, make_brand, make_part):
    b = make_part(Rod, brand=make_brand("Zz Order B"), name="Alpha")
    a2 = make_part(Rod, brand=make_brand("Zz Order A"), name="Beta")
    a1 = make_part(Rod, brand=a2.brand, name="Alpha")

    ids = [row["id"] for row in client.get("/api/parts/rod").json()]

    assert ids.index(a1.id) < ids.index(a2.id) < ids.index(b.id)


def test_reel_has_link_and_image(client, make_part):
    reel = make_part(
        Reel, purchase_url="https://shop.example/r", image_path="reels/x.webp"
    )

    row = find(client.get("/api/parts/reel").json(), reel.id)

    assert row["purchaseUrl"] == "https://shop.example/r"
    assert row["imageUrl"] == "/parts/reels/x.webp"


def test_rods_take_link_and_image_from_their_series(
    client, make_brand, make_part, make_rod_series
):
    brand = make_brand()
    series = make_rod_series(
        brand=brand, purchase_url="https://shop.example/s", image_path="rods/x.webp"
    )
    rods = [
        make_part(Rod, brand=brand, series=series, line_weight=w, size_code=f"{w}90-4")
        for w in (4, 5)
    ]

    rows = client.get("/api/parts/rod").json()

    for rod in rods:
        row = find(rows, rod.id)
        assert row["purchaseUrl"] == "https://shop.example/s"
        assert row["imageUrl"] == "/parts/rods/x.webp"
        assert row["seriesId"] == series.id
    assert find(rows, rods[0].id)["sizeCode"] == "490-4"


def test_rod_list_is_one_query(engine, client, make_part):
    make_part(Rod)
    statements = []

    def record(conn, cursor, statement, *args):
        statements.append(statement)

    event.listen(engine, "before_cursor_execute", record)
    try:
        assert client.get("/api/parts/rod").status_code == 200
    finally:
        event.remove(engine, "before_cursor_execute", record)
    assert len(statements) == 1


def test_part_without_details_has_nulls(client, make_part):
    rod = make_part(Rod)

    row = find(client.get("/api/parts/rod").json(), rod.id)

    assert row["purchaseUrl"] is None
    assert row["imageUrl"] is None


@pytest.mark.parametrize(
    ("model", "category"),
    [(FlyLine, "line"), (Leader, "leader"), (Tippet, "tippet")],
)
def test_small_parts_have_link_and_image(client, make_part, model, category):
    part = make_part(
        model,
        purchase_url="https://shop.example/p",
        image_path=f"{category}s/x.webp",
    )
    bare = make_part(model, name="Bare")

    rows = client.get(f"/api/parts/{category}").json()

    assert find(rows, part.id)["purchaseUrl"] == "https://shop.example/p"
    assert find(rows, part.id)["imageUrl"] == f"/parts/{category}s/x.webp"
    assert find(rows, bare.id)["imageUrl"] is None
