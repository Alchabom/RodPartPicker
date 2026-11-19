import pytest
from sqlalchemy.exc import DBAPIError

from app.parts.links import image_url_for, safe_purchase_url
from app.parts.models import FlyLine, Leader, Reel, Rod, Tippet

CHECK_VIOLATED = 3819


@pytest.mark.parametrize("model", [Rod, Reel, FlyLine, Leader, Tippet])
@pytest.mark.parametrize("bad", ["javascript:alert(1)", "http://example.com"])
def test_purchase_url_check_rejects(make_part, model, bad):
    with pytest.raises(DBAPIError) as e:
        make_part(model, purchase_url=bad)

    assert e.value.orig.args[0] == CHECK_VIOLATED


@pytest.mark.parametrize(
    ("model", "bad"),
    [
        (Rod, "../x.webp"),
        (Rod, "rods/x.png"),
        (Rod, "rods/X.webp"),
        (Rod, "https://evil.example/x.webp"),
        (Reel, "rods/x.webp"),
    ],
)
def test_image_path_check_rejects(make_part, model, bad):
    with pytest.raises(DBAPIError) as e:
        make_part(model, image_path=bad)

    assert e.value.orig.args[0] == CHECK_VIOLATED


def test_valid_values_are_accepted(make_part):
    rod = make_part(
        Rod,
        purchase_url="https://shop.example/r",
        image_path="rods/lamson-liquid.webp",
    )

    assert rod.id is not None


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
