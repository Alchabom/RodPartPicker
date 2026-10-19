"""Shared fixtures: a freshly migrated MySQL test database, and per-test sessions
that roll back so no test sees another test's writes."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.config import settings
from app.db import engine as app_engine
from app.db import get_db, make_url
from app.main import app
from app.migrate import migrate


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
