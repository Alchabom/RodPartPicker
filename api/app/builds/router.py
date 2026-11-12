from typing import Annotated

from fastapi import APIRouter, HTTPException, Path
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.deps import CurrentUserId
from app.builds.models import Build
from app.builds.schemas import BuildIn, BuildOut
from app.db import DbSession

BuildId = Annotated[int, Path(gt=0)]
router = APIRouter(prefix="/builds", tags=["builds"])


def _commit(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        if e.orig.args[0] == 1452:  # foreign key violation
            raise HTTPException(
                status_code=400, detail="Referenced part does not exist"
            ) from e
        raise


def _get_owned_build(db: Session, build_id: int, user_id: int) -> Build:
    build = db.get(Build, build_id)
    if build is None or build.user_id != user_id:
        raise HTTPException(status_code=404, detail="Build not found")
    return build


@router.get("")
def list_builds(db: DbSession, user_id: CurrentUserId) -> list[BuildOut]:
    stmt = (
        select(Build)
        .where(Build.user_id == user_id)
        .order_by(Build.updated_at.desc(), Build.id.desc())
    )
    return db.scalars(stmt).all()


@router.get("/{build_id}")
def get_build(build_id: BuildId, db: DbSession, user_id: CurrentUserId) -> BuildOut:
    return _get_owned_build(db, build_id, user_id)


@router.post("", status_code=201)
def create_build(build: BuildIn, db: DbSession, user_id: CurrentUserId) -> BuildOut:
    new_build = Build(
        user_id=user_id,
        name=build.name,
        rod_id=build.rod_id,
        reel_id=build.reel_id,
        fly_line_id=build.fly_line_id,
        leader_id=build.leader_id,
        tippet_id=build.tippet_id,
    )
    db.add(new_build)
    _commit(db)
    db.refresh(new_build)
    return new_build


@router.put("/{build_id}", status_code=204)
def update_build(
    build_id: BuildId, build: BuildIn, db: DbSession, user_id: CurrentUserId
) -> None:
    existing_build = _get_owned_build(db, build_id, user_id)

    existing_build.name = build.name
    existing_build.rod_id = build.rod_id
    existing_build.reel_id = build.reel_id
    existing_build.fly_line_id = build.fly_line_id
    existing_build.leader_id = build.leader_id
    existing_build.tippet_id = build.tippet_id
    _commit(db)


@router.delete("/{build_id}", status_code=204)
def delete_build(build_id: BuildId, db: DbSession, user_id: CurrentUserId) -> None:
    existing_build = _get_owned_build(db, build_id, user_id)
    db.delete(existing_build)
    _commit(db)
