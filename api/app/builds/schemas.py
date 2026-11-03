"""Schemas for builds endpoints."""

from datetime import datetime
from typing import Annotated

from pydantic import PositiveInt, StringConstraints

from app.schemas import CamelModel


class BuildIn(CamelModel):
    """Request body schema for creating or updating a build."""

    name: Annotated[
        str, StringConstraints(min_length=1, max_length=120, strip_whitespace=True)
    ]
    rod_id: PositiveInt | None = None
    reel_id: PositiveInt | None = None
    fly_line_id: PositiveInt | None = None
    leader_id: PositiveInt | None = None
    tippet_id: PositiveInt | None = None


class BuildOut(BuildIn):
    """Response schema for a build."""

    id: int
    created_at: datetime
    updated_at: datetime
