import pytest
from sqlalchemy.exc import DBAPIError

from app.parts.links import image_url_for, safe_purchase_url
from app.parts.models import FlyLine, Leader, Reel, Tippet

CHECK_VIOLATED = 3819


# Rod links and images live on rod_series; test_rod_series.py checks those
@pytest.mark.parametrize("model", [Reel, FlyLine, Leader, Tippet])
@pytest.mark.parametrize("bad", ["javascript:alert(1)", "http://example.com"])
def test_purchase_url_check_rejects(make_part, model, bad):
    with pytest.raises(DBAPIError) as e:
        make_part(model, purchase_url=bad)

    assert e.value.orig.args[0] == CHECK_VIOLATED


@pytest.mark.parametrize(
    ("model", "bad"),
    [
        (Reel, "../x.webp"),
        (Reel, "reels/x.png"),
        (Reel, "reels/X.webp"),
        (Reel, "https://evil.example/x.webp"),
        (Reel, "rods/x.webp"),
    ],
)
def test_image_path_check_rejects(make_part, model, bad):
    with pytest.raises(DBAPIError) as e:
        make_part(model, image_path=bad)

    assert e.value.orig.args[0] == CHECK_VIOLATED


def test_valid_values_are_accepted(make_part, make_rod_series):
    reel = make_part(
        Reel,
        purchase_url="https://shop.example/r",
        image_path="reels/lamson-liquid-s.webp",
    )
    series = make_rod_series(
        purchase_url="https://shop.example/s",
        image_path="rods/lamson-liquid.webp",
    )

    assert reel.id is not None
    assert series.id is not None


def test_safe_purchase_url():
    assert safe_purchase_url("https://a.example/x") == "https://a.example/x"
    assert safe_purchase_url("javascript:alert(1)") is None
    assert safe_purchase_url("http://a.example") is None
    assert safe_purchase_url(" https://a.example") is None
    assert safe_purchase_url("") is None
    assert safe_purchase_url(None) is None


def test_image_url_for():
    assert (
        image_url_for("reels/lamson-liquid-s.webp")
        == "/parts/reels/lamson-liquid-s.webp"
    )
    for bad in [
        "../x.webp",
        "rods/x.png",
        "rods/X.webp",
        "lines/x.webp",
        "rods/a/b.webp",
    ]:
        assert image_url_for(bad) is None
    assert image_url_for(None) is None
