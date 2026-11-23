from typing import Annotated, Literal

from pydantic import AfterValidator, AliasPath, Field

from app.parts.links import image_url_for, safe_purchase_url
from app.schemas import CamelModel

# DECIMAL columns are declared as float: Pydantic writes Decimal as a JSON
# string, and the frontend expects numbers.

Water = Literal["fresh", "salt", "both"]
Material = Literal["nylon", "fluorocarbon"]
PurchaseUrl = Annotated[str | None, AfterValidator(safe_purchase_url)]
ImageUrl = Annotated[
    str | None, Field(validation_alias="image_path"), AfterValidator(image_url_for)
]


class PartOut(CamelModel):
    """Fields every part category returns."""

    id: int
    brand: str = Field(validation_alias=AliasPath("brand", "name"))
    model: str = Field(validation_alias="name")
    water: Water
    purchase_url: PurchaseUrl


class RodOut(PartOut):
    # A rod's link and image belong to its series
    purchase_url: Annotated[
        str | None,
        Field(validation_alias=AliasPath("series", "purchase_url")),
        AfterValidator(safe_purchase_url),
    ]
    image_url: Annotated[
        str | None,
        Field(validation_alias=AliasPath("series", "image_path")),
        AfterValidator(image_url_for),
    ]
    series_id: int
    size_code: str | None
    action: Literal["slow", "medium", "medium_fast", "fast"] | None
    line_weight: int
    length_in: int
    pieces: int | None
    price: float


class ReelOut(PartOut):
    image_url: ImageUrl
    min_line_weight: int
    max_line_weight: int
    price: float


class LineOut(PartOut):
    image_url: ImageUrl
    type: Literal["floating", "intermediate", "sink_tip", "full_sink"] | None
    sink_rate_ips: float | None
    line_weight: int
    head_weight_grains: int | None
    price: float


class LeaderOut(PartOut):
    image_url: ImageUrl
    material: Material
    length_ft: float
    x_size: str | None = Field(validation_alias=AliasPath("x_size", "label"))
    strength_lb: float | None
    pack_count: int
    price: float | None


class TippetOut(PartOut):
    image_url: ImageUrl
    material: Material
    x_size: str | None = Field(validation_alias=AliasPath("x_size", "label"))
    strength_lb: float | None
    spool_yards: int
    price: float
