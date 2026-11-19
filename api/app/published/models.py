"""The PublishedBuild model for the published_builds table (migration 020)."""

from datetime import datetime

from sqlalchemy import ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.auth.models import User
from app.db import Base
from app.parts.models import FlyLine, Leader, Reel, Rod, Tippet


class PublishedBuild(Base):
    __tablename__ = "published_builds"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    source_build_id: Mapped[int | None] = mapped_column(ForeignKey("builds.id"))
    title: Mapped[str] = mapped_column(String(80))
    writeup: Mapped[str] = mapped_column(Text)
    rod_id: Mapped[int | None] = mapped_column(ForeignKey("rods.id"))
    reel_id: Mapped[int | None] = mapped_column(ForeignKey("reels.id"))
    fly_line_id: Mapped[int | None] = mapped_column(ForeignKey("fly_lines.id"))
    leader_id: Mapped[int | None] = mapped_column(ForeignKey("leaders.id"))
    tippet_id: Mapped[int | None] = mapped_column(ForeignKey("tippets.id"))
    published_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now())

    user: Mapped[User] = relationship()
    rod: Mapped[Rod | None] = relationship()
    reel: Mapped[Reel | None] = relationship()
    fly_line: Mapped[FlyLine | None] = relationship()
    leader: Mapped[Leader | None] = relationship()
    tippet: Mapped[Tippet | None] = relationship()
