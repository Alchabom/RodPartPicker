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
