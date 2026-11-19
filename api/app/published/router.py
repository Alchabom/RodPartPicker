"""Published builds: owner routes nested on a saved build, and public routes."""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.auth.deps import CurrentUserId
from app.auth.models import User
from app.builds.ownership import get_owned_build
from app.db import DbSession
from app.published.models import PublishedBuild
from app.published.schemas import PublishedRefOut, PublishIn

BuildId = Annotated[int, Path(gt=0)]
owner_router = APIRouter(prefix="/builds/{build_id}/published", tags=["published"])
public_router = APIRouter(prefix="/published", tags=["published"])


def _get_published(db: DbSession, build_id: int) -> PublishedBuild:
    published = db.scalar(
        select(PublishedBuild).where(PublishedBuild.source_build_id == build_id)
    )
    if published is None:
        raise HTTPException(status_code=404, detail="Not published")
    return published


@owner_router.get("")
def get_my_published(
    build_id: BuildId, db: DbSession, user_id: CurrentUserId
) -> PublishedRefOut:
    get_owned_build(db, build_id, user_id)
    return _get_published(db, build_id)


@owner_router.put("", status_code=200)
def publish_build(
    build_id: BuildId,
    body: PublishIn,
    response: Response,
    db: DbSession,
    user_id: CurrentUserId,
) -> PublishedRefOut:
    build = get_owned_build(db, build_id, user_id)
    parts = {
        "rod_id": build.rod_id,
        "reel_id": build.reel_id,
        "fly_line_id": build.fly_line_id,
        "leader_id": build.leader_id,
        "tippet_id": build.tippet_id,
    }
    if any(part_id is None for part_id in parts.values()):
        raise HTTPException(
            status_code=400, detail="Add all five parts before publishing"
        )
    user = db.get(User, user_id)
    if user is None or user.display_name is None:
        raise HTTPException(status_code=409, detail="Choose a display name first")

    published = db.scalar(
        select(PublishedBuild).where(PublishedBuild.source_build_id == build_id)
    )
    if published is None:
        published = PublishedBuild(
            user_id=user_id,
            source_build_id=build_id,
            title=body.title,
            writeup=body.writeup,
            **parts,
        )
        db.add(published)
        response.status_code = 201
    else:
        published.title = body.title
        published.writeup = body.writeup
        for column, part_id in parts.items():
            setattr(published, column, part_id)

    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        if e.orig.args[0] == 1062:  # two first publishes raced on uq_published_source
            raise HTTPException(status_code=409, detail="Already published") from e
        raise
    db.refresh(published)
    return published


@owner_router.delete("", status_code=204)
def unpublish_build(build_id: BuildId, db: DbSession, user_id: CurrentUserId) -> None:
    get_owned_build(db, build_id, user_id)
    published = _get_published(db, build_id)
    db.delete(published)
    db.commit()
