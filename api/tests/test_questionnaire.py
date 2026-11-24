"""Tests for GET /api/questionnaire/recommend. The picks resolve against the seeded
catalog that the migrations load into the test database."""

from itertools import product

import pytest

from app.parts.models import FlyLine, Leader, Reel, Rod, Tippet
from app.questionnaire.rules import creeks
from app.questionnaire.rules.rivers import FLIES_BY_TARGET

URL = "/api/questionnaire/recommend"
CHECK_URL = "/api/compatibility/check"
MODELS = {"rod": Rod, "reel": Reel, "line": FlyLine, "leader": Leader, "tippet": Tippet}
CHECK_PARAMS = {
    "rod": "rodId",
    "reel": "reelId",
    "line": "flyLineId",
    "leader": "leaderId",
    "tippet": "tippetId",
}
ALL_PARAMS = [
    {
        "experience": experience,
        "place": "small_creeks",
        "trout": trout,
        "onlyRod": only_rod,
        "budget": budget,
    }
    for experience, trout, only_rod, budget in product(
        ["low", "medium", "high"],
        ["true", "false"],
        ["true", "false"],
        ["low", "medium", "high"],
    )
]


def params(**overrides) -> dict:
    return ALL_PARAMS[0] | overrides


def recommend(client, **query) -> list[dict]:
    response = client.get(URL, params=query)
    assert response.status_code == 200, response.text
    return response.json()["parts"]


@pytest.mark.parametrize("query", ALL_PARAMS)
def test_every_combination_returns_real_parts(client, db, query):
    parts = recommend(client, **query)
    assert [part["component"] for part in parts] == list(MODELS)
    for part in parts:
        assert db.get(MODELS[part["component"]], part["partId"]) is not None
        assert part["reason"].strip()


@pytest.mark.parametrize("query", ALL_PARAMS)
def test_every_combination_passes_the_compatibility_check(client, query):
    parts = recommend(client, **query)
    ids = {CHECK_PARAMS[part["component"]]: part["partId"] for part in parts}
    response = client.get(CHECK_URL, params=ids)
    assert response.status_code == 200
    assert response.json()["warnings"] == []


def test_low_budget_only_rod_gets_the_redington_376(client, db):
    parts = recommend(client, **params())
    rod = db.get(Rod, parts[0]["partId"])
    assert (rod.brand.name, rod.name) == ("Redington", "Classic Trout 376-4")


@pytest.mark.parametrize(
    "overrides",
    [
        {"place": "large_rivers"},  # creek answers don't fit rivers
        {"place": "lakes_ponds"},
        {"target": "trout"},
        {"experience": "expert"},
        {"budget": None},
        {"onlyRod": "maybe"},
    ],
)
def test_bad_answers_return_422(client, overrides):
    query = {k: v for k, v in params(**overrides).items() if v is not None}
    assert client.get(URL, params=query).status_code == 422


def test_a_missing_pick_returns_500(client, monkeypatch):
    missing = creeks.REDINGTON_376 | {"length_in": 999}  # no rod is this long
    setups = creeks.SETUPS | {
        (True, "low"): (missing, *creeks.SETUPS[(True, "low")][1:])
    }
    monkeypatch.setattr(creeks, "SETUPS", setups)
    response = client.get(URL, params=params())
    assert response.status_code == 500
    assert response.json()["detail"] == "Recommended part is missing from the catalog"


RIVER_PARAMS = [
    {
        "experience": experience,
        "place": "large_rivers",
        "target": target,
        "flies": flies,
        "budget": budget,
    }
    for experience, (target, flies), budget in product(
        ["low", "medium", "high"],
        [(t, f) for t, options in FLIES_BY_TARGET.items() for f in options],
        ["low", "medium", "high"],
    )
]


def river_params(**overrides) -> dict:
    query = RIVER_PARAMS[0] | overrides
    return {k: v for k, v in query.items() if v is not None}


@pytest.mark.parametrize("query", RIVER_PARAMS)
def test_every_river_combination_returns_real_parts(client, db, query):
    parts = recommend(client, **query)
    assert [part["component"] for part in parts] == list(MODELS)
    for part in parts:
        assert db.get(MODELS[part["component"]], part["partId"]) is not None
        assert part["reason"].strip()


@pytest.mark.parametrize("query", RIVER_PARAMS)
def test_every_river_combination_passes_the_compatibility_check(client, query):
    parts = recommend(client, **query)
    ids = {CHECK_PARAMS[part["component"]]: part["partId"] for part in parts}
    response = client.get(CHECK_URL, params=ids)
    assert response.status_code == 200
    assert response.json()["warnings"] == []


def test_musky_gets_the_wire_bite_tippet(client, db):
    parts = recommend(client, **river_params(target="predators", flies="weighted"))
    tippet = db.get(Tippet, parts[4]["partId"])
    assert (tippet.name, tippet.x_size_id) == ("Powerflex Wire Bite Tippet", None)


@pytest.mark.parametrize(
    "overrides",
    [
        {"trout": "true"},
        {"onlyRod": "false"},
        {"target": "smallmouth", "flies": "unweighted"},
        {"flies": None},
        {"target": None},
        {"target": "carp"},
    ],
)
def test_bad_river_answers_return_422(client, overrides):
    assert client.get(URL, params=river_params(**overrides)).status_code == 422
