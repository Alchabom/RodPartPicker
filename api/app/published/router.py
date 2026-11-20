"""Published builds: owner routes nested on a saved build, and public routes."""

from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, Query, Response
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import contains_eager, selectinload

from app.auth.deps import CurrentUserId
from app.auth.models import User
from app.builds.ownership import get_owned_build
from app.db import DbSession
from app.parts.models import FlyLine, Leader, Reel, Rod, Tippet
from app.published.models import PublishedBuild
from app.published.schemas import (
    ImagePartRefOut,
    PublishedBuildOut,
    PublishedPageOut,
    PublishedPartsOut,
    PublishedRefOut,
    PublishedSummaryOut,
    PublishIn,
    RodRefOut,
)

BuildId = Annotated[int, Path(gt=0)]
owner_router = APIRouter(prefix="/builds/{build_id}/published", tags=["published"])
public_router = APIRouter(prefix="/published", tags=["published"])
PAGE_SIZE = 20


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


# ---------- Public routes ----------

TOTAL_PRICE = (
    func.coalesce(Rod.price, 0)
    + func.coalesce(Reel.price, 0)
    + func.coalesce(FlyLine.price, 0)
    + func.coalesce(Leader.price, 0)
    + func.coalesce(Tippet.price, 0)
).label("total_price")

# Each part relationship, chained to its brand, so a page costs a fixed number
# of queries however many builds it holds.
LOAD_PARTS = [
    selectinload(PublishedBuild.rod).options(
        selectinload(Rod.brand), selectinload(Rod.series)
    ),
    selectinload(PublishedBuild.reel).selectinload(Reel.brand),
    selectinload(PublishedBuild.fly_line).selectinload(FlyLine.brand),
    selectinload(PublishedBuild.leader).selectinload(Leader.brand),
    selectinload(PublishedBuild.tippet).selectinload(Tippet.brand),
]


def _base_select():
    """Published builds with their author and (possibly removed) parts."""
    return (
        select(PublishedBuild, TOTAL_PRICE)
        .join(User, PublishedBuild.user_id == User.id)
        .outerjoin(Rod, PublishedBuild.rod_id == Rod.id)
        .outerjoin(Reel, PublishedBuild.reel_id == Reel.id)
        .outerjoin(FlyLine, PublishedBuild.fly_line_id == FlyLine.id)
        .outerjoin(Leader, PublishedBuild.leader_id == Leader.id)
        .outerjoin(Tippet, PublishedBuild.tippet_id == Tippet.id)
        .options(contains_eager(PublishedBuild.user), *LOAD_PARTS)
    )


def _part(
    part: Rod | Reel | FlyLine | Leader | Tippet | None,
) -> ImagePartRefOut | None:
    if part is None:
        return None
    fields = {
        "id": part.id,
        "brand": part.brand.name,
        "name": part.name,
        "price": part.price,
    }
    # A rod's link and image belong to its series
    if isinstance(part, Rod):
        return ImagePartRefOut(
            **fields,
            purchase_url=part.series.purchase_url,
            image_path=part.series.image_path,
        )
    return ImagePartRefOut(
        **fields, purchase_url=part.purchase_url, image_path=part.image_path
    )


def _rod_ref(rod: Rod | None) -> RodRefOut | None:
    if rod is None:
        return None
    return RodRefOut(
        brand=rod.brand.name,
        name=rod.name,
        line_weight=rod.line_weight,
        image_path=rod.series.image_path,
    )


def _summary_fields(published: PublishedBuild, total: Decimal) -> dict:
    return {
        "id": published.id,
        "title": published.title,
        "author": published.user.display_name,
        "rod": _rod_ref(published.rod),
        "total_price": total,
        "published_at": published.published_at,
    }


@public_router.get("")
def list_published(
    db: DbSession,
    page: Annotated[int, Query(ge=1, le=10_000)] = 1,
    weight: Annotated[int | None, Query(ge=1, le=15)] = None,
    max_price: Annotated[Decimal | None, Query(alias="maxPrice", ge=0)] = None,
) -> PublishedPageOut:
    base = _base_select()
    if weight is not None:
        base = base.where(Rod.line_weight == weight)
    if max_price is not None:
        base = base.where(TOTAL_PRICE.element <= max_price)

    total = db.scalar(select(func.count()).select_from(base.subquery()))
    rows = db.execute(
        base.order_by(PublishedBuild.published_at.desc(), PublishedBuild.id.desc())
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE)
    ).all()
    return PublishedPageOut(
        items=[
            PublishedSummaryOut(**_summary_fields(published, price))
            for published, price in rows
        ],
        page=page,
        page_size=PAGE_SIZE,
        total=total,
    )


@public_router.get("/{published_id}")
def get_published(published_id: BuildId, db: DbSession) -> PublishedBuildOut:
    row = db.execute(
        _base_select().where(PublishedBuild.id == published_id)
    ).one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Published build not found")
    published, total = row
    return PublishedBuildOut(
        **_summary_fields(published, total),
        writeup=published.writeup,
        updated_at=published.updated_at,
        parts=PublishedPartsOut(
            rod=_part(published.rod),
            reel=_part(published.reel),
            line=_part(published.fly_line),
            leader=_part(published.leader),
            tippet=_part(published.tippet),
        ),
    )
