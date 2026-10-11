from fastapi import APIRouter, Depends, FastAPI, Response
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db import get_db

app = FastAPI()
api = APIRouter(prefix="/api")


@api.get("/health")
def health(response: Response, db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"api": "ok", "db": "ok"}
    except SQLAlchemyError:
        response.status_code = 503
        return {"api": "ok", "db": "unreachable"}


app.include_router(api)
