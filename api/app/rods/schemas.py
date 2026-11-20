import re
from typing import Annotated, Literal

from pydantic import AfterValidator

from app.parts.links import image_url_for
from app.parts.schemas import PurchaseUrl, Water
from app.schemas import CamelModel

# The stored image path goes in; the public URL comes out
SeriesImageUrl = Annotated[str | None, AfterValidator(image_url_for)]


def brand_slug(name: str) -> str:
    """ "Scientific Anglers" -> "scientific-anglers". Must match slugify() in
    src/features/builder/api/parts.ts, which builds the brand URLs."""
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


class BrandRefOut(CamelModel):
    name: str
    slug: str


class RodSizeOut(CamelModel):
    id: int
    size_code: str | None
    line_weight: int
    length_in: int
    action: Literal["slow", "medium", "medium_fast", "fast"] | None
    pieces: int | None
    water: Water
    price: float


class RodSeriesSummaryOut(CamelModel):
    size_count: int
    min_line_weight: int
    max_line_weight: int
    min_length_in: int
    max_length_in: int
    min_price: float
    max_price: float


class RodSeriesOut(CamelModel):
    id: int
    slug: str
    name: str
    brand: BrandRefOut
    image_url: SeriesImageUrl
    purchase_url: PurchaseUrl
    summary: RodSeriesSummaryOut
    sizes: list[RodSizeOut]
