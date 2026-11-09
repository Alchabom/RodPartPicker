"""Auth tables: users, login_codes and refresh_tokens (migration 016_auth.sql).

Mirrors the migration; never call create_all(). Every datetime column is set
by Python from get_now() (naive UTC), so none has a server_default.
"""

from datetime import datetime

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str]
    display_name: Mapped[str | None]
    created_at: Mapped[datetime]


class LoginCode(Base):
    __tablename__ = "login_codes"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str]
    code_hash: Mapped[str]
    # Python inserts the row, so the DB default alone would leave None here
    attempts: Mapped[int] = mapped_column(default=0)
    requester_ip: Mapped[str]
    expires_at: Mapped[datetime]
    consumed_at: Mapped[datetime | None]
    created_at: Mapped[datetime]


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    family_id: Mapped[str]
    token_hash: Mapped[str]
    expires_at: Mapped[datetime]
    revoked_at: Mapped[datetime | None]
    created_at: Mapped[datetime]
