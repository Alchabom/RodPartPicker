from fastapi import APIRouter, FastAPI, Request, Response
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.auth.router import router as auth_router
from app.builds.router import router as builds_router
from app.compatibility.router import router as compatibility_router
from app.config import settings
from app.db import DbSession
from app.parts.router import router as parts_router

WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

app = FastAPI()
api = APIRouter(prefix="/api")


@app.middleware("http")
async def check_origin(request: Request, call_next):
    # CSRF defense in depth: browsers always send Origin on these methods
    if (
        request.method in WRITE_METHODS
        and (request.url.path == "/api" or request.url.path.startswith("/api/"))
        and request.headers.get("origin") != settings.APP_ORIGIN
    ):
        return JSONResponse({"detail": "Origin not allowed"}, status_code=403)
    return await call_next(request)


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
api.include_router(auth_router)
app.include_router(api)
