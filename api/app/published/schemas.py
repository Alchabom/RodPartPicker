"""Schemas for the published-builds endpoints."""

from datetime import datetime
from typing import Annotated

from pydantic import StringConstraints

from app.schemas import CamelModel


class PublishIn(CamelModel):
    """Request body for publishing or updating a published build."""

    title: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=3, max_length=80)
    ]
    writeup: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)
    ]


class PublishedRefOut(CamelModel):
    """What the owner sees about their saved build's published build."""

    id: int
    title: str
    writeup: str
    updated_at: datetime


class RodRefOut(CamelModel):
    brand: str
    name: str
    line_weight: int


class PartRefOut(CamelModel):
    id: int
    brand: str
    name: str
    price: float | None


class PublishedSummaryOut(CamelModel):
    id: int
    title: str
    author: str
    rod: RodRefOut | None
    total_price: float
    published_at: datetime


class PublishedPartsOut(CamelModel):
    rod: PartRefOut | None
    reel: PartRefOut | None
    line: PartRefOut | None
    leader: PartRefOut | None
    tippet: PartRefOut | None


class PublishedBuildOut(PublishedSummaryOut):
    writeup: str
    updated_at: datetime
    parts: PublishedPartsOut


class PublishedPageOut(CamelModel):
    items: list[PublishedSummaryOut]
    page: int
    page_size: int
    total: int
