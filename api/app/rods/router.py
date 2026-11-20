from collections import defaultdict

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import contains_eager

from app.db import DbSession
from app.parts.models import Brand, Rod, RodSeries
from app.rods.schemas import (
    BrandRefOut,
    RodSeriesOut,
    RodSeriesSummaryOut,
    RodSizeOut,
    brand_slug,
)

router = APIRouter(prefix="/rods", tags=["rods"])


def _summary(sizes: list[Rod]) -> RodSeriesSummaryOut:
    weights = [r.line_weight for r in sizes]
    lengths = [r.length_in for r in sizes]
    prices = [r.price for r in sizes]
    return RodSeriesSummaryOut(
        size_count=len(sizes),
        min_line_weight=min(weights),
        max_line_weight=max(weights),
        min_length_in=min(lengths),
        max_length_in=max(lengths),
        min_price=min(prices),
        max_price=max(prices),
    )


@router.get("/series")
def list_rod_series(db: DbSession, brand: str | None = None) -> list[RodSeriesOut]:
    """Rod series with their sizes, grouped and summarized for the rod picker.

    Explicit queries (series, then their rods) keep the count fixed however
    many series there are; nothing here loads lazily."""
    stmt = (
        select(RodSeries)
        .join(RodSeries.brand)
        .options(contains_eager(RodSeries.brand))
        .order_by(Brand.name, RodSeries.name)
    )
    if brand is not None:
        # Brands have no slug column; there are only a handful to compare
        brand_ids = [
            b.id for b in db.scalars(select(Brand)) if brand_slug(b.name) == brand
        ]
        if not brand_ids:
            return []
        stmt = stmt.where(RodSeries.brand_id.in_(brand_ids))
    series = db.scalars(stmt).all()
    if not series:
        return []

    sizes: dict[int, list[Rod]] = defaultdict(list)
    rods = db.scalars(
        select(Rod)
        .where(Rod.series_id.in_([s.id for s in series]))
        .order_by(Rod.series_id, Rod.line_weight, Rod.length_in, Rod.id)
    )
    for rod in rods:
        sizes[rod.series_id].append(rod)

    return [
        RodSeriesOut(
            id=s.id,
            slug=s.slug,
            name=s.name,
            brand=BrandRefOut(name=s.brand.name, slug=brand_slug(s.brand.name)),
            image_url=s.image_path,
            purchase_url=s.purchase_url,
            summary=_summary(sizes[s.id]),
            sizes=[RodSizeOut.model_validate(r) for r in sizes[s.id]],
        )
        # A series with no rods has nothing to pick, so it's left out
        for s in series
        if sizes[s.id]
    ]
