import pytest
from sqlalchemy import func, select

from app.parts.models import Brand, FlyLine, Leader, Reel, Rod, Tippet, XSize


@pytest.mark.parametrize("model", [Brand, XSize, Rod, Reel, FlyLine, Leader, Tippet])
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
    assert db.scalar(both_reels) == 13

    # x_sizes ids rise as tippet gets finer, and 4X is id 8
    fresh_sizes = db.scalars(
        select(Tippet.x_size_id).where(Tippet.water == "fresh")
    ).all()
    assert min(fresh_sizes) == 8
