from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends
from sqlalchemy import URL, Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


def make_url(db_name: str) -> URL:
    return URL.create(
        drivername="mysql+pymysql",
        username=settings.DB_USER,
        password=settings.DB_PASSWORD,
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        database=db_name,
    )


def make_engine(db_name: str) -> Engine:
    # TIMESTAMP columns are converted using the session time zone; pin it to
    # UTC so the API reads and writes UTC whatever the server's zone is.
    return create_engine(
        make_url(db_name),
        pool_pre_ping=True,
        connect_args={"init_command": "SET time_zone = '+00:00'"},
    )


engine = make_engine(settings.DB_NAME)

SessionLocal = sessionmaker(bind=engine)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


DbSession = Annotated[Session, Depends(get_db)]


class Base(DeclarativeBase):
    pass
