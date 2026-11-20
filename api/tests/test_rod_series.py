"""Rod series: migration 024's data and constraints, and GET /api/rods/series.

The migration tests read the seeded catalog the migrations load into the test
database."""

import pytest
from sqlalchemy import event, select, text
from sqlalchemy.exc import DBAPIError

from app.parts.models import Brand, Rod, RodSeries
from app.rods.schemas import brand_slug

CHECK_VIOLATED = 3819
DUPLICATE = 1062

# (brand, name, slug), as listed in the spec
SERIES = [
    ("Lamson", "E-Series", "e-series"),
    ("Lamson", "Liquid", "liquid"),
    ("Lamson", "Liquid Max", "liquid-max"),
    ("Lamson", "Speedster", "speedster"),
    ("Orvis", "Clearwater", "clearwater"),
    ("Orvis", "Encounter", "encounter"),
    ("Orvis", "Helios D", "helios-d"),
    ("Orvis", "Helios F", "helios-f"),
    ("Orvis", "Recon Freshwater", "recon-freshwater"),
    ("Orvis", "Recon Saltwater", "recon-saltwater"),
    ("Orvis", "Superfine Glass", "superfine-glass"),
    ("Orvis", "Superfine Graphite", "superfine-graphite"),
    ("Redington", "Classic Trout", "classic-trout"),
    ("Redington", "EDC", "edc"),
    ("Sage", "Classic R8", "classic-r8"),
    ("Sage", "Foundation", "foundation"),
    ("Sage", "Power R8", "power-r8"),
    ("Sage", "R8 Core", "r8-core"),
    ("Sage", "Salt R8", "salt-r8"),
    ("Sage", "Spey R8", "spey-r8"),
]

# Lamson and Orvis rods are matched by exact name; Redington and Sage by prefix
EXACT = {
    ("Lamson", "e-series"): "E-Series",
    ("Lamson", "liquid"): "Liquid",
    ("Lamson", "liquid max"): "Liquid Max",
    ("Lamson", "speedster"): "Speedster",
    ("Lamson", "speedster with fighting butt"): "Speedster",
    ("Orvis", "Clearwater"): "Clearwater",
    ("Orvis", "Encounter"): "Encounter",
    ("Orvis", "Helios D"): "Helios D",
    ("Orvis", "Helios F"): "Helios F",
    ("Orvis", "Recon Freshwater"): "Recon Freshwater",
    ("Orvis", "Recon Saltwater"): "Recon Saltwater",
    ("Orvis", "Superfine Glass"): "Superfine Glass",
    ("Orvis", "Superfine Grafite"): "Superfine Graphite",
}
PREFIXES = {
    "Redington": ["Classic Trout", "EDC"],
    "Sage": ["Classic R8", "Foundation", "Power R8", "R8 Core", "Salt R8", "Spey R8"],
}


def expected_series(brand: str, name: str) -> str:
    if (brand, name) in EXACT:
        return EXACT[(brand, name)]
    matches = [p for p in PREFIXES.get(brand, []) if name.startswith(p + " ")]
    assert len(matches) == 1, f"{brand} {name} matches {matches}"
    return matches[0]


def seeded_rods(db):
    # Test-made brands are named "Test Brand N"; the seeded catalog is the rest
    return db.execute(
        select(Brand.name, Rod.name, RodSeries.name, Rod.size_code)
        .join(Brand, Rod.brand_id == Brand.id)
        .join(RodSeries, Rod.series_id == RodSeries.id)
        .where(Brand.name.not_like("Test Brand %"))
    ).all()


def series_by_slug(db, slug):
    return db.scalars(select(RodSeries).where(RodSeries.slug == slug)).one()


# ---------- Migration 024 ----------


def test_there_are_twenty_series(db):
    rows = db.execute(
        select(Brand.name, RodSeries.name, RodSeries.slug)
        .join(Brand, RodSeries.brand_id == Brand.id)
        .order_by(Brand.name, RodSeries.name)
    ).all()

    assert [tuple(r) for r in rows] == sorted(SERIES, key=lambda s: (s[0], s[1]))


def test_every_rod_is_in_its_series(db):
    rows = seeded_rods(db)
    total = db.scalar(select(text("COUNT(*)")).select_from(Rod))

    assert len(rows) == total == 193
    for brand, name, series, _ in rows:
        assert series == expected_series(brand, name), f"{brand} {name}"


def test_speedster_holds_both_lamson_rows(db):
    names = db.scalars(
        select(Rod.name).where(Rod.series_id == series_by_slug(db, "speedster").id)
    ).all()

    assert set(names) == {"speedster", "speedster with fighting butt"}


@pytest.mark.parametrize(
    ("name", "code"),
    [
        ("R8 Core 590-4", "590-4"),
        ("EDC 690-4 FB", "690-4 FB"),
        ("Power R8 690-4FB", "690-4FB"),
        ("speedster with fighting butt", "Fighting butt"),
        ("Clearwater", None),
        ("speedster", None),
    ],
)
def test_size_codes(db, name, code):
    codes = set(db.scalars(select(Rod.size_code).where(Rod.name == name)).all())

    assert codes == {code}


def test_series_links_match_migration_022(db):
    assert (
        series_by_slug(db, "r8-core").purchase_url
        == "https://farbank.com/products/sage-r8-core-rod"
    )
    assert (
        series_by_slug(db, "clearwater").purchase_url
        == "https://www.orvis.com/product/clearwater-fly-rod/25SP.html"
    )
    missing = db.scalars(
        select(RodSeries.name).where(RodSeries.purchase_url.is_(None))
    ).all()
    assert missing == []


def test_rods_have_no_link_or_image_columns(db):
    columns = {row[0] for row in db.execute(text("SHOW COLUMNS FROM rods"))}

    assert "purchase_url" not in columns
    assert "image_path" not in columns
    assert {"series_id", "size_code"} <= columns


@pytest.mark.parametrize(
    ("column", "bad"),
    [
        ("purchase_url", "javascript:alert(1)"),
        ("purchase_url", "http://example.com"),
        ("image_path", "../x.webp"),
        ("image_path", "rods/x.png"),
        ("image_path", "rods/X.webp"),
        ("image_path", "reels/x.webp"),
        ("slug", "R8 Core"),
        ("slug", "r8--core"),
    ],
)
def test_series_checks_reject(make_rod_series, column, bad):
    with pytest.raises(DBAPIError) as e:
        make_rod_series(**{column: bad})

    assert e.value.orig.args[0] == CHECK_VIOLATED


@pytest.mark.parametrize("column", ["name", "slug"])
def test_series_duplicates_reject(make_brand, make_rod_series, column):
    brand = make_brand()
    first = make_rod_series(brand=brand)

    with pytest.raises(DBAPIError) as e:
        make_rod_series(brand=brand, **{column: getattr(first, column)})

    assert e.value.orig.args[0] == DUPLICATE


# ---------- GET /api/rods/series ----------

SERIES_URL = "/api/rods/series"


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


@pytest.mark.parametrize(
    ("name", "slug"),
    [
        ("Sage", "sage"),
        ("Scientific Anglers", "scientific-anglers"),
        ("  Odd & Co.  ", "odd-co"),
    ],
)
def test_brand_slug(name, slug):
    assert brand_slug(name) == slug


def test_series_are_grouped_and_sorted(client):
    series = client.get(SERIES_URL).json()

    keys = [(s["brand"]["name"], s["name"]) for s in series]
    assert keys == sorted(keys)
    for s in series:
        order = [(z["lineWeight"], z["lengthIn"], z["id"]) for z in s["sizes"]]
        assert order == sorted(order)


def test_brand_filter(client):
    sage = client.get(SERIES_URL, params={"brand": "sage"}).json()
    unknown = client.get(SERIES_URL, params={"brand": "nope"})

    assert [s["name"] for s in sage] == [
        "Classic R8",
        "Foundation",
        "Power R8",
        "R8 Core",
        "Salt R8",
        "Spey R8",
    ]
    assert {s["brand"]["slug"] for s in sage} == {"sage"}
    assert unknown.status_code == 200
    assert unknown.json() == []


def test_summary_matches_sizes(client):
    for s in client.get(SERIES_URL).json():
        sizes, summary = s["sizes"], s["summary"]
        assert summary["sizeCount"] == len(sizes) > 0
        for field, key in [
            ("LineWeight", "lineWeight"),
            ("LengthIn", "lengthIn"),
            ("Price", "price"),
        ]:
            values = [z[key] for z in sizes]
            assert summary[f"min{field}"] == min(values)
            assert summary[f"max{field}"] == max(values)


def test_r8_core(client):
    (core,) = [
        s
        for s in client.get(SERIES_URL, params={"brand": "sage"}).json()
        if s["slug"] == "r8-core"
    ]

    assert core["purchaseUrl"] == "https://farbank.com/products/sage-r8-core-rod"
    assert core["summary"] == {
        "sizeCount": 19,
        "minLineWeight": 3,
        "maxLineWeight": 9,
        "minLengthIn": 102,
        "maxLengthIn": 120,
        "minPrice": 1100.0,
        "maxPrice": 1100.0,
    }
    assert {"590-4", "690-4FB"} <= {z["sizeCode"] for z in core["sizes"]}


def test_size_ids_match_parts(client):
    rods = {r["id"]: r for r in client.get("/api/parts/rod").json()}

    for s in client.get(SERIES_URL).json():
        for size in s["sizes"]:
            assert rods[size["id"]]["seriesId"] == s["id"]


def test_series_image_and_link(client, make_brand, make_rod_series, make_part):
    brand = make_brand("Imageco")
    full = make_rod_series(
        brand=brand,
        name="Full",
        slug="full",
        image_path="rods/x.webp",
        purchase_url="https://a.example",
    )
    bare = make_rod_series(brand=brand, name="Bare", slug="bare")
    for series in (full, bare):
        make_part(Rod, series=series, name=f"{series.name} 590-4")

    rows = {
        s["slug"]: s for s in client.get(SERIES_URL, params={"brand": "imageco"}).json()
    }

    assert rows["full"]["imageUrl"] == "/parts/rods/x.webp"
    assert rows["full"]["purchaseUrl"] == "https://a.example"
    assert rows["bare"]["imageUrl"] is None
    assert rows["bare"]["purchaseUrl"] is None
    assert rows["full"]["brand"] == {"name": "Imageco", "slug": "imageco"}


def test_size_shape(client, make_brand, make_rod_series, make_part):
    series = make_rod_series(brand=make_brand("Shapeco"))
    rod = make_part(Rod, series=series, size_code="590-4", pieces=None)

    (row,) = client.get(SERIES_URL, params={"brand": "shapeco"}).json()

    assert row["sizes"] == [
        {
            "id": rod.id,
            "sizeCode": "590-4",
            "lineWeight": 5,
            "lengthIn": 108,
            "action": "fast",
            "pieces": None,
            "water": "fresh",
            "price": 500.0,
        }
    ]


@pytest.mark.parametrize("params", ["", "?brand=sage"])
def test_series_query_count_is_constant(
    engine, client, make_brand, make_rod_series, make_part, params
):
    # The first request in a test runs one extra setup statement
    count_statements(engine, client, SERIES_URL + params)
    before = count_statements(engine, client, SERIES_URL + params)
    for _ in range(3):
        series = make_rod_series(brand=make_brand())
        for weight in (4, 5):
            make_part(Rod, series=series, line_weight=weight)

    assert count_statements(engine, client, SERIES_URL + params) == before
