"""Shared fixtures: a freshly migrated MySQL test database, and per-test sessions
that roll back so no test sees another test's writes."""

from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.config import settings
from app.db import engine as app_engine
from app.db import get_db, make_url
from app.main import app
from app.migrate import migrate
from app.parts.models import Brand, FlyLine, Leader, Reel, Rod, Tippet


@pytest.fixture(scope="session")
def engine():
    # Dropping the dev database would lose real data
    assert settings.TEST_DB_NAME != settings.DB_NAME, (
        "TEST_DB_NAME must differ from DB_NAME"
    )
    with app_engine.connect() as conn:
        conn.execute(text(f"DROP DATABASE IF EXISTS `{settings.TEST_DB_NAME}`"))
    migrate(settings.TEST_DB_NAME)

    test_engine = create_engine(make_url(settings.TEST_DB_NAME))
    yield test_engine
    test_engine.dispose()


@pytest.fixture
def db(engine):
    conn = engine.connect()
    trans = conn.begin()
    session = Session(bind=conn, join_transaction_mode="create_savepoint")
    yield session
    session.close()
    trans.rollback()
    conn.close()


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()


# ---------- Factories ----------
# Each returns a function that inserts one row with sensible defaults; pass
# keyword arguments to override any column. Rows are flushed so ids exist,
# and disappear with the test's rollback.


@pytest.fixture
def make_brand(db):
    count = 0

    def make(name=None):
        nonlocal count
        count += 1
        brand = Brand(name=name or f"Test Brand {count}")
        db.add(brand)
        db.flush()
        return brand

    return make


@pytest.fixture
def make_part(db, make_brand):
    def make(model, **columns):
        if "brand" not in columns and "brand_id" not in columns:
            columns["brand"] = make_brand()
        part = model(**{**PART_DEFAULTS[model], **columns})
        db.add(part)
        db.flush()
        return part

    return make


PART_DEFAULTS = {
    Rod: {
        "name": "Test Rod",
        "action": "fast",
        "water": "fresh",
        "line_weight": 5,
        "length_in": 108,
        "pieces": 4,
        "price": Decimal("500.00"),
    },
    Reel: {
        "name": "Test Reel",
        "water": "fresh",
        "min_line_weight": 4,
        "max_line_weight": 6,
        "price": Decimal("200.00"),
    },
    FlyLine: {
        "name": "Test Line",
        "water": "fresh",
        "line_weight": 5,
        "type": "floating",
        "head_weight_grains": 140,
        "price": Decimal("100.00"),
    },
    Leader: {
        "name": "Test Leader",
        "material": "nylon",
        "water": "fresh",
        "length_ft": Decimal("9.0"),
        "x_size_id": 9,
        "pack_count": 1,
    },
    Tippet: {
        "name": "Test Tippet",
        "material": "nylon",
        "water": "fresh",
        "x_size_id": 9,
        "spool_yards": 30,
        "price": Decimal("5.00"),
    },
}
