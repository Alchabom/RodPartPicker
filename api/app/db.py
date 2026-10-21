from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends
from sqlalchemy import URL, create_engine
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


engine = create_engine(make_url(settings.DB_NAME), pool_pre_ping=True)

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
