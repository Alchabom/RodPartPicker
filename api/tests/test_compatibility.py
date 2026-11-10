from decimal import Decimal

import pytest

from app.parts.models import FlyLine, Leader, Reel, Rod, Tippet

CHECK_URL = "/api/compatibility/check"
PARTS_URL = "/api/compatibility/parts"
GRAINS_MAX_5WT = 146  # from the line_weights table

# Seeded parts also appear in results, so these tests check the rows they
# insert with `in` and `not in`, and never compare whole lists.


def get_parts(client, **params):
    response = client.get(PARTS_URL, params=params)
    assert response.status_code == 200
    return response.json()


# ---------- GET /api/compatibility/parts ----------


def test_parts_response_shape(client):
    assert set(get_parts(client)) == {
        "rod",
        "reel",
        "line",
        "leader",
        "tippet",
        "recommendedLine",
    }


def test_parts_with_no_filters_returns_everything(client, make_part):
    fresh_reel = make_part(Reel, water="fresh")
    salt_reel = make_part(Reel, water="salt")

    data = get_parts(client)

    assert fresh_reel.id in data["reel"]
    assert salt_reel.id in data["reel"]
    assert data["recommendedLine"] == []


def test_parts_match_the_rods_weight(client, make_part):
    rod = make_part(Rod, line_weight=5)
    fitting_reel = make_part(Reel, min_line_weight=4, max_line_weight=6)
    other_reel = make_part(Reel, min_line_weight=6, max_line_weight=8)
    fitting_line = make_part(FlyLine, line_weight=5)
    other_line = make_part(FlyLine, line_weight=6)

    data = get_parts(client, rodId=rod.id)

    assert fitting_reel.id in data["reel"]
    assert other_reel.id not in data["reel"]
    assert fitting_line.id in data["line"]
    assert other_line.id not in data["line"]


def test_parts_use_the_rods_water_tag(client, make_part):
    rod = make_part(Rod, water="fresh")
    fresh_tippet = make_part(Tippet, water="fresh")
    both_tippet = make_part(Tippet, water="both")
    salt_tippet = make_part(Tippet, water="salt")

    data = get_parts(client, rodId=rod.id)

    assert fresh_tippet.id in data["tippet"]
    assert both_tippet.id in data["tippet"]
    assert salt_tippet.id not in data["tippet"]


def test_parts_water_parameter_filters_a_both_rod(client, make_part):
    rod = make_part(Rod, line_weight=8, water="both")
    fresh_line = make_part(FlyLine, line_weight=8, water="fresh")
    salt_line = make_part(FlyLine, line_weight=8, water="salt")

    data = get_parts(client, rodId=rod.id, water="salt")

    assert salt_line.id in data["line"]
    assert fresh_line.id not in data["line"]


def test_both_rod_with_no_parameter_matches_either_water(client, make_part):
    rod = make_part(Rod, line_weight=8, water="both")
    fresh_line = make_part(FlyLine, line_weight=8, water="fresh")
    salt_line = make_part(FlyLine, line_weight=8, water="salt")

    data = get_parts(client, rodId=rod.id)

    assert fresh_line.id in data["line"]
    assert salt_line.id in data["line"]


def test_salt_parameter_with_no_rod_filters_every_component(client, make_part):
    salt_rod = make_part(Rod, line_weight=7, water="salt")
    light_rod = make_part(Rod, line_weight=6, water="salt")
    fresh_rod = make_part(Rod, line_weight=8, water="fresh")
    salt_reel = make_part(Reel, min_line_weight=5, max_line_weight=7, water="salt")
    light_reel = make_part(Reel, min_line_weight=4, max_line_weight=6, water="salt")
    salt_line = make_part(FlyLine, line_weight=7, water="salt")
    light_line = make_part(FlyLine, line_weight=6, water="salt")
    fresh_tippet = make_part(Tippet, water="fresh")

    data = get_parts(client, water="salt")

    assert salt_rod.id in data["rod"]
    assert light_rod.id not in data["rod"]
    assert fresh_rod.id not in data["rod"]
    assert salt_reel.id in data["reel"]
    assert light_reel.id not in data["reel"]
    assert salt_line.id in data["line"]
    assert light_line.id not in data["line"]
    assert fresh_tippet.id not in data["tippet"]


def test_salt_rod_keeps_its_matches_without_the_parameter(client, make_part):
    rod = make_part(Rod, line_weight=6, water="salt")
    line = make_part(FlyLine, line_weight=6, water="salt")

    data = get_parts(client, rodId=rod.id)

    assert line.id in data["line"]


@pytest.mark.parametrize("rod_weight, expected", [(6, False), (7, True)])
def test_heavy_leader_needs_a_7wt_rod(client, make_part, rod_weight, expected):
    rod = make_part(Rod, line_weight=rod_weight)
    leader = make_part(Leader, strength_lb=Decimal("10.0"))

    data = get_parts(client, rodId=rod.id)

    assert (leader.id in data["leader"]) is expected


@pytest.mark.parametrize(
    "action, head_grains, expected",
    [
        ("fast", GRAINS_MAX_5WT + 1, True),
        ("fast", GRAINS_MAX_5WT, False),
        ("medium", GRAINS_MAX_5WT + 1, False),
    ],
)
def test_recommended_lines(client, make_part, action, head_grains, expected):
    rod = make_part(Rod, line_weight=5, action=action)
    line = make_part(FlyLine, line_weight=5, head_weight_grains=head_grains)

    data = get_parts(client, rodId=rod.id)

    assert line.id in data["line"]
    assert (line.id in data["recommendedLine"]) is expected


def test_heavy_line_that_doesnt_match_is_not_recommended(client, make_part):
    rod = make_part(Rod, line_weight=5, action="fast")
    line = make_part(FlyLine, line_weight=6, head_weight_grains=500)

    data = get_parts(client, rodId=rod.id)

    assert line.id not in data["recommendedLine"]


def test_parts_unknown_rod(client):
    response = client.get(PARTS_URL, params={"rodId": 999999})

    assert response.status_code == 400
    assert response.json() == {"detail": "Referenced part does not exist"}


@pytest.mark.parametrize("params", [{"water": "both"}, {"water": "lake"}, {"rodId": 0}])
def test_parts_invalid_parameters(client, params):
    assert client.get(PARTS_URL, params=params).status_code == 422


def test_leader_limits_tippets_to_its_size_or_one_finer(client, make_part):
    leader = make_part(Leader, x_size_id=9)  # 5X
    heavier = make_part(Tippet, x_size_id=8)
    same = make_part(Tippet, x_size_id=9)
    finer = make_part(Tippet, x_size_id=10)
    too_fine = make_part(Tippet, x_size_id=11)

    data = get_parts(client, leaderId=leader.id)

    assert same.id in data["tippet"]
    assert finer.id in data["tippet"]
    assert heavier.id not in data["tippet"]
    assert too_fine.id not in data["tippet"]


def test_tippet_limits_leaders(client, make_part):
    tippet = make_part(Tippet, x_size_id=7)  # 3X
    fits = make_part(Leader, x_size_id=6)
    clashes = make_part(Leader, x_size_id=9)
    no_size = make_part(Leader, x_size_id=None)

    data = get_parts(client, tippetId=tippet.id)

    assert fits.id in data["leader"]
    assert clashes.id not in data["leader"]
    assert no_size.id in data["leader"]


def test_selected_line_limits_reels_on_a_both_rod(client, make_part):
    rod = make_part(Rod, line_weight=8, water="both")
    line = make_part(FlyLine, line_weight=8, water="salt")
    fresh_reel = make_part(Reel, min_line_weight=7, max_line_weight=9, water="fresh")
    both_reel = make_part(Reel, min_line_weight=7, max_line_weight=9, water="both")

    data = get_parts(client, rodId=rod.id, flyLineId=line.id)

    assert fresh_reel.id not in data["reel"]
    assert both_reel.id in data["reel"]


def test_selected_line_limits_rods_with_no_rod_selected(client, make_part):
    line = make_part(FlyLine, line_weight=5)
    fits = make_part(Rod, line_weight=5)
    clashes = make_part(Rod, line_weight=6)

    data = get_parts(client, flyLineId=line.id)

    assert fits.id in data["rod"]
    assert clashes.id not in data["rod"]


def test_a_component_ignores_its_own_selected_part(client, make_part):
    selected = make_part(Reel, min_line_weight=4, max_line_weight=6)
    other = make_part(Reel, min_line_weight=8, max_line_weight=10)

    data = get_parts(client, reelId=selected.id)

    assert other.id in data["reel"]


def test_existing_clash_doesnt_block_other_components(client, make_part):
    rod = make_part(Rod, line_weight=2)
    reel = make_part(Reel, min_line_weight=6, max_line_weight=8)
    leader = make_part(Leader)

    data = get_parts(client, rodId=rod.id, reelId=reel.id)

    assert leader.id in data["leader"]


def test_salt_parameter_doesnt_override_a_fresh_rod(client, make_part):
    rod = make_part(Rod, line_weight=8, water="fresh")
    line = make_part(FlyLine, line_weight=8, water="salt")

    data = get_parts(client, rodId=rod.id, water="salt")

    assert line.id not in data["line"]


@pytest.mark.parametrize(
    "param", ["rodId", "reelId", "flyLineId", "leaderId", "tippetId"]
)
def test_parts_unknown_id(client, param):
    response = client.get(PARTS_URL, params={param: 999999})

    assert response.status_code == 400
    assert response.json() == {"detail": "Referenced part does not exist"}


@pytest.mark.parametrize(
    "component, param", [("reel", "reelId"), ("tippet", "tippetId")]
)
def test_highlighted_parts_never_cause_a_warning(client, make_part, component, param):
    build = {
        "rodId": make_part(Rod, line_weight=5).id,
        "flyLineId": make_part(FlyLine, line_weight=5).id,
        "leaderId": make_part(Leader, x_size_id=9).id,
    }

    highlighted = get_parts(client, **build)[component]

    assert highlighted
    for part_id in highlighted:
        response = client.get(CHECK_URL, params={**build, param: part_id})
        assert response.json() == {"warnings": []}


# ---------- GET /api/compatibility/check ----------


def test_mismatched_rod_and_line(client, make_part):
    rod = make_part(Rod, line_weight=5)
    line = make_part(FlyLine, line_weight=7)

    response = client.get(CHECK_URL, params={"rodId": rod.id, "flyLineId": line.id})

    assert response.status_code == 200
    codes = [w["code"] for w in response.json()["warnings"]]
    assert "ROD_LINE_WEIGHT" in codes


def test_compatible_build(client, make_part):
    rod = make_part(Rod, line_weight=5)
    line = make_part(FlyLine, line_weight=5)

    response = client.get(CHECK_URL, params={"rodId": rod.id, "flyLineId": line.id})

    assert response.status_code == 200
    assert response.json() == {"warnings": []}


def test_check_with_no_parts(client):
    response = client.get(CHECK_URL)

    assert response.status_code == 200
    assert response.json() == {"warnings": []}


@pytest.mark.parametrize(
    "param", ["rodId", "reelId", "flyLineId", "leaderId", "tippetId"]
)
def test_unknown_id(client, param):
    response = client.get(CHECK_URL, params={param: 999999})

    assert response.status_code == 400
    assert response.json() == {"detail": "Referenced part does not exist"}


def test_reel_id_zero(client):
    response = client.get(CHECK_URL, params={"reelId": 0})

    assert response.status_code == 422
