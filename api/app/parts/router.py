from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import contains_eager

from app.db import DbSession
from app.parts.models import Brand, FlyLine, Leader, Reel, Rod, Tippet, XSize
from app.parts.schemas import LeaderOut, LineOut, ReelOut, RodOut, TippetOut

router = APIRouter(prefix="/parts", tags=["parts"])

# Each query joins the brand and fills .brand from that same row
# (contains_eager), so listing N parts is one query, not N+1.


@router.get("/rod")
def list_rods(db: DbSession) -> list[RodOut]:
    stmt = (
        select(Rod)
        .join(Rod.brand)
        .options(contains_eager(Rod.brand))
        .order_by(Brand.name, Rod.name, Rod.line_weight, Rod.length_in)
    )
    return db.scalars(stmt).all()


@router.get("/reel")
def list_reels(db: DbSession) -> list[ReelOut]:
    stmt = (
        select(Reel)
        .join(Reel.brand)
        .options(contains_eager(Reel.brand))
        .order_by(Brand.name, Reel.name, Reel.min_line_weight)
    )
    return db.scalars(stmt).all()


@router.get("/line")
def list_lines(db: DbSession) -> list[LineOut]:
    stmt = (
        select(FlyLine)
        .join(FlyLine.brand)
        .options(contains_eager(FlyLine.brand))
        .order_by(Brand.name, FlyLine.name, FlyLine.line_weight)
    )
    return db.scalars(stmt).all()


@router.get("/leader")
def list_leaders(db: DbSession) -> list[LeaderOut]:
    stmt = (
        select(Leader)
        .join(Leader.brand)
        .outerjoin(Leader.x_size)  # x_size is optional for leaders
        .options(contains_eager(Leader.brand), contains_eager(Leader.x_size))
        .order_by(Brand.name, Leader.name, Leader.length_ft, Leader.x_size_id)
    )
    return db.scalars(stmt).all()


@router.get("/tippet")
def list_tippets(db: DbSession) -> list[TippetOut]:
    stmt = (
        select(Tippet)
        .join(Tippet.brand)
        .join(Tippet.x_size)
        .options(contains_eager(Tippet.brand), contains_eager(Tippet.x_size))
        .order_by(Brand.name, Tippet.name, XSize.id)
    )
    return db.scalars(stmt).all()
