from decimal import Decimal

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, declared_attr, mapped_column, relationship

from app.db import Base

# Mirrors the tables created by api/migrations; never call create_all().
# Line-weight columns have no ForeignKey because line_weights isn't mapped.


class Brand(Base):
    __tablename__ = "brands"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]


class XSize(Base):
    __tablename__ = "x_sizes"

    id: Mapped[int] = mapped_column(primary_key=True)
    label: Mapped[str]


class CatalogPart:
    """Columns every product table shares."""

    id: Mapped[int] = mapped_column(primary_key=True)
    brand_id: Mapped[int] = mapped_column(ForeignKey("brands.id"))
    name: Mapped[str]
    water: Mapped[str]

    # Built once per subclass, since each joins from its own table
    @declared_attr
    def brand(cls) -> Mapped[Brand]:
        return relationship()


class Rod(CatalogPart, Base):
    __tablename__ = "rods"

    action: Mapped[str | None]
    line_weight: Mapped[int]
    length_in: Mapped[int]
    pieces: Mapped[int | None]
    price: Mapped[Decimal]


class Reel(CatalogPart, Base):
    __tablename__ = "reels"

    min_line_weight: Mapped[int]
    max_line_weight: Mapped[int]
    price: Mapped[Decimal]


class FlyLine(CatalogPart, Base):
    __tablename__ = "fly_lines"

    line_weight: Mapped[int]
    type: Mapped[str | None]
    sink_rate_ips: Mapped[Decimal | None]
    head_weight_grains: Mapped[int | None]
    price: Mapped[Decimal]


class Leader(CatalogPart, Base):
    __tablename__ = "leaders"

    material: Mapped[str]
    length_ft: Mapped[Decimal]
    x_size_id: Mapped[int | None] = mapped_column(ForeignKey("x_sizes.id"))
    strength_lb: Mapped[Decimal | None]
    pack_count: Mapped[int]
    price: Mapped[Decimal | None]

    x_size: Mapped[XSize | None] = relationship()


class Tippet(CatalogPart, Base):
    __tablename__ = "tippets"

    material: Mapped[str]
    x_size_id: Mapped[int] = mapped_column(ForeignKey("x_sizes.id"))
    strength_lb: Mapped[Decimal | None]
    spool_yards: Mapped[int]
    price: Mapped[Decimal]

    x_size: Mapped[XSize] = relationship()
