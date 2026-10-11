from collections.abc import Iterator

from sqlalchemy import URL, create_engine
from app.config import settings
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

DATABASE_URL = URL.create(drivername="mysql+pymysql", 
                          username=settings.DB_USER,
                          password=settings.DB_PASSWORD,
                          host=settings.DB_HOST,
                          port=settings.DB_PORT,
                          database=settings.DB_NAME)


engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine)

class Base(DeclarativeBase):
    pass

def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()







    