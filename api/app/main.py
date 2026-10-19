from fastapi import APIRouter, FastAPI, Response
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.db import DbSession

app = FastAPI()
api = APIRouter(prefix="/api")


@api.get("/health")
def health(response: Response, db: DbSession):
    try:
        db.execute(text("SELECT 1"))
        return {"api": "ok", "db": "ok"}
    except SQLAlchemyError:
        response.status_code = 503
        return {"api": "ok", "db": "unreachable"}


app.include_router(api)
