from fastapi import APIRouter, FastAPI, Response
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.builds.router import router as builds_router
from app.compatibility.router import router as compatibility_router
from app.db import DbSession
from app.parts.router import router as parts_router

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


api.include_router(parts_router)
api.include_router(builds_router)
api.include_router(compatibility_router)
app.include_router(api)
