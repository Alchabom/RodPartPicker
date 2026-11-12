"""Tests for GET /api/questionnaire/recommend. The picks resolve against the seeded
catalog that the migrations load into the test database."""

from itertools import product

import pytest

from app.parts.models import FlyLine, Leader, Reel, Rod, Tippet
from app.questionnaire import rules

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
        {"place": "large_rivers"},
        {"experience": "expert"},
        {"budget": None},
        {"onlyRod": "maybe"},
    ],
)
def test_bad_answers_return_422(client, overrides):
    query = {k: v for k, v in params(**overrides).items() if v is not None}
    assert client.get(URL, params=query).status_code == 422


def test_a_missing_pick_returns_500(client, monkeypatch):
    missing = rules.REDINGTON_376 | {"length_in": 999}  # no rod is this long
    setups = rules.SETUPS | {(True, "low"): (missing, *rules.SETUPS[(True, "low")][1:])}
    monkeypatch.setattr(rules, "SETUPS", setups)
    response = client.get(URL, params=params())
    assert response.status_code == 500
    assert response.json()["detail"] == "Recommended part is missing from the catalog"
