from decimal import Decimal

import pytest

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
