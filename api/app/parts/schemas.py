from typing import Literal

from pydantic import AliasPath, Field

from app.schemas import CamelModel

# DECIMAL columns are declared as float: Pydantic writes Decimal as a JSON
# string, and the frontend expects numbers.

Water = Literal["fresh", "salt", "both"]
Material = Literal["nylon", "fluorocarbon"]


class PartOut(CamelModel):
    """Fields every part category returns."""

    id: int
    brand: str = Field(validation_alias=AliasPath("brand", "name"))
    model: str = Field(validation_alias="name")
    water: Water


class RodOut(PartOut):
    action: Literal["slow", "medium", "medium_fast", "fast"] | None
    line_weight: int
    length_in: int
    pieces: int | None
    price: float


class ReelOut(PartOut):
    min_line_weight: int
    max_line_weight: int
    price: float


class LineOut(PartOut):
    type: Literal["floating", "intermediate", "sink_tip", "full_sink"] | None
    sink_rate_ips: float | None
    line_weight: int
    head_weight_grains: int | None
    price: float


class LeaderOut(PartOut):
    material: Material
    length_ft: float
    x_size: str | None = Field(validation_alias=AliasPath("x_size", "label"))
    strength_lb: float | None
    pack_count: int
    price: float | None


class TippetOut(PartOut):
    material: Material
    x_size: str = Field(validation_alias=AliasPath("x_size", "label"))
    strength_lb: float | None
    spool_yards: int
    price: float
