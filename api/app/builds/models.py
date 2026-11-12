"""Defines the Build model for the builds table in the database."""

from datetime import datetime

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Build(Base):
    __tablename__ = "builds"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(120))
    rod_id: Mapped[int | None] = mapped_column(ForeignKey("rods.id"))
    reel_id: Mapped[int | None] = mapped_column(ForeignKey("reels.id"))
    fly_line_id: Mapped[int | None] = mapped_column(ForeignKey("fly_lines.id"))
    leader_id: Mapped[int | None] = mapped_column(ForeignKey("leaders.id"))
    tippet_id: Mapped[int | None] = mapped_column(ForeignKey("tippets.id"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now())
