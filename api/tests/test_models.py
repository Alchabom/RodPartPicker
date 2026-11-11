from datetime import datetime

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError

from app.auth.models import LoginCode, RefreshToken, User
from app.parts.models import (
    Brand,
    FlyLine,
    Leader,
    LineWeight,
    Reel,
    Rod,
    Tippet,
    XSize,
)


@pytest.mark.parametrize(
    "model",
    [
        Brand,
        XSize,
        Rod,
        Reel,
        FlyLine,
        Leader,
        Tippet,
        LineWeight,
        User,
        LoginCode,
        RefreshToken,
    ],
)
def test_model_columns_match_table(db, model):
    # Selecting every mapped column fails with "Unknown column" on any typo
    db.scalars(select(model).limit(1)).all()


def test_part_loads_its_brand_and_x_size(db, make_brand, make_part):
    brand = make_brand("Mapping Check")
    tippet = make_part(Tippet, brand=brand)
    db.expire_all()  # force a real reload from MySQL

    loaded = db.get(Tippet, tippet.id)
    assert loaded.brand.name == "Mapping Check"
    assert loaded.x_size.label == "5X"


def test_water_tags_cover_strong_tippets_and_sealed_reels(db):
    both_tippets = (
        select(func.count()).select_from(Tippet).where(Tippet.water == "both")
    )
    both_reels = select(func.count()).select_from(Reel).where(Reel.water == "both")
    assert db.scalar(both_tippets) == 16
    assert db.scalar(both_reels) == 21

    # x_sizes ids rise as tippet gets finer, and 4X is id 8
    fresh_sizes = db.scalars(
        select(Tippet.x_size_id).where(Tippet.water == "fresh")
    ).all()
    assert min(fresh_sizes) == 8

    sealed_waters = db.scalars(
        select(Reel.water).where(Reel.name.like("%(sealed)%")).distinct()
    ).all()
    assert sealed_waters == ["both"]


def test_water_tags_cover_heavy_rods(db):
    # 7 wt and up suits saltwater too; saltwater-specific rods keep salt
    heavy_waters = db.scalars(
        select(Rod.water).where(Rod.line_weight >= 7).distinct()
    ).all()
    assert sorted(heavy_waters) == ["both", "salt"]

    fresh_weights = db.scalars(
        select(Rod.line_weight).where(Rod.water == "fresh")
    ).all()
    assert max(fresh_weights) == 6


def test_display_name_unique_ignoring_case(db):
    db.execute(
        text(
            "INSERT INTO users (email, display_name, created_at)"
            " VALUES ('a@x.com', 'TroutBum', UTC_TIMESTAMP())"
        )
    )
    with pytest.raises(IntegrityError):
        db.execute(
            text(
                "INSERT INTO users (email, display_name, created_at)"
                " VALUES ('b@x.com', 'troutbum', UTC_TIMESTAMP())"
            )
        )


def test_display_name_collation_is_pinned(db):
    # The local server already defaults to this collation, so the insert test
    # above would pass without the column's COLLATE; TiDB may not default to it
    collation = db.execute(
        text(
            "SELECT COLLATION_NAME FROM information_schema.COLUMNS"
            " WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'"
            " AND COLUMN_NAME = 'display_name'"
        )
    ).scalar_one()
    assert collation == "utf8mb4_0900_ai_ci"


def test_make_user_round_trips(db, make_user):
    user = make_user(display_name="TroutBum")
    db.expire_all()  # force a real reload from MySQL

    loaded = db.get(User, user.id)
    assert loaded.email == user.email
    assert loaded.display_name == "TroutBum"
    assert loaded.created_at == datetime(2026, 1, 1, 12, 0)
