"""The ownership check shared by the builds and published-builds routers."""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.builds.models import Build


def get_owned_build(db: Session, build_id: int, user_id: int) -> Build:
    build = db.get(Build, build_id)
    if build is None or build.user_id != user_id:
        raise HTTPException(status_code=404, detail="Build not found")
    return build
