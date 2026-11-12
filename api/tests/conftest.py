"""Shared fixtures: a freshly migrated MySQL test database, and per-test sessions
that roll back so no test sees another test's writes."""

from datetime import datetime, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth.deps import get_now
from app.auth.email import EmailSendError, get_email_sender
from app.auth.models import User
from app.builds.models import Build
from app.config import settings
from app.db import engine as app_engine
from app.db import get_db, make_engine
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

    test_engine = make_engine(settings.TEST_DB_NAME)
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


@pytest.fixture(scope="session", autouse=True)
def insecure_cookies():
    # TestClient speaks plain http, and a client drops Secure cookies over http
    old = settings.COOKIE_SECURE
    settings.COOKIE_SECURE = False
    yield
    settings.COOKIE_SECURE = old


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    # The Origin middleware rejects writes without the app's Origin header
    yield TestClient(app, headers={"Origin": settings.APP_ORIGIN})
    app.dependency_overrides.pop(get_db, None)


# ---------- Auth fakes ----------
# Each overrides one dependency and removes only its own override afterwards.


class FakeClock:
    def __init__(self):
        self.now = datetime(2026, 1, 1, 12, 0)

    def advance(self, **timedelta_kwargs):
        self.now += timedelta(**timedelta_kwargs)


@pytest.fixture
def clock():
    fake = FakeClock()
    app.dependency_overrides[get_now] = lambda: fake.now
    yield fake
    app.dependency_overrides.pop(get_now, None)


class FakeEmailSender:
    def __init__(self):
        self.sent: list[tuple[str, str]] = []
        self.fail = False

    def send_login_code(self, to: str, code: str) -> None:
        if self.fail:
            raise EmailSendError("fake send failure")
        self.sent.append((to, code))

    def last_code_for(self, email: str) -> str:
        codes = [code for to, code in self.sent if to == email]
        assert codes, f"no code was sent to {email}"
        return codes[-1]


@pytest.fixture
def fake_email():
    fake = FakeEmailSender()
    app.dependency_overrides[get_email_sender] = lambda: fake
    yield fake
    app.dependency_overrides.pop(get_email_sender, None)


@pytest.fixture
def login():
    """Sign a client in through the real /code + /verify flow.

    Returns a function: login(client, fake_email, email=...) -> the UserOut
    JSON. The client keeps the auth cookies, so later requests are signed in.
    """

    def sign_in(client, fake_email, email="angler@example.com"):
        assert client.post("/api/auth/code", json={"email": email}).status_code == 202
        code = fake_email.last_code_for(email)
        response = client.post("/api/auth/verify", json={"email": email, "code": code})
        assert response.status_code == 200, response.text
        return response.json()

    return sign_in


@pytest.fixture
def signed_in(client, fake_email, login):
    """Sign the client in; returns the signed-in UserOut JSON."""
    return login(client, fake_email)


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


@pytest.fixture
def make_build(db, make_user):
    count = 0

    def make(**columns):
        nonlocal count
        count += 1
        if "user_id" not in columns and "user" not in columns:
            columns["user_id"] = make_user().id
        build = Build(**{"name": f"Test Build {count}", **columns})
        db.add(build)
        db.flush()
        return build

    return make


@pytest.fixture
def make_user(db):
    count = 0

    def make(**columns):
        nonlocal count
        count += 1
        defaults = {
            "email": f"user{count}@example.com",
            "display_name": None,
            "created_at": datetime(2026, 1, 1, 12, 0),
        }
        user = User(**{**defaults, **columns})
        db.add(user)
        db.flush()
        return user

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
