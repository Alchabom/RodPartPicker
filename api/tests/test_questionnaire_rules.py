"""Tests for the questionnaire pick rules. Plain data, so no database."""

from decimal import Decimal
from itertools import product

import pytest

from app.questionnaire import rules
from app.questionnaire.rules import Answers

COMPONENTS = ["rod", "reel", "line", "leader", "tippet"]
ALL_ANSWERS = [
    Answers(experience=experience, trout=trout, only_rod=only_rod, budget=budget)
    for experience, trout, only_rod, budget in product(
        ["low", "medium", "high"],
        [True, False],
        [True, False],
        ["low", "medium", "high"],
    )
]


def picks_by_component(answers: Answers) -> dict[str, rules.Pick]:
    return {pick.component: pick for pick in rules.recommend(answers)}


def answers(**overrides) -> Answers:
    values = {"experience": "low", "trout": True, "only_rod": True, "budget": "low"}
    return Answers(**(values | overrides))


def test_there_are_36_answer_combinations():
    assert len(set(ALL_ANSWERS)) == 36


@pytest.mark.parametrize("combo", ALL_ANSWERS)
def test_every_combination_gives_five_picks_with_reasons(combo):
    picks = rules.recommend(combo)
    assert [pick.component for pick in picks] == COMPONENTS
    assert all(pick.reason.strip() for pick in picks)


# ---------- The spec's tables ----------


def rod(brand, name, weight, length):
    return {"brand": brand, "name": name, "line_weight": weight, "length_in": length}


def reel(name):
    return {"brand": "Lamson", "name": name, "min_line_weight": 2, "max_line_weight": 4}


def line(name, weight):
    return {"brand": "RIO", "name": name, "line_weight": weight}


REDINGTON_376 = rod("Redington", "Classic Trout 376-4", 3, 90)
REDINGTON_486 = rod("Redington", "Classic Trout 486-4", 4, 102)
SAGE_380 = rod("Sage", "Classic R8 380-4", 3, 96)
SAGE_486 = rod("Sage", "Classic R8 486-4", 4, 102)
SAGE_CORE_486 = rod("Sage", "R8 Core 486-4", 4, 102)


@pytest.mark.parametrize(
    "only_rod, budget, expected_rod, expected_reel, expected_line",
    [
        (True, "low", REDINGTON_376, reel("Liquid S"), line("Avid Trout-Gold", 3)),
        (True, "medium", REDINGTON_376, reel("Guru X"), line("Avid Trout-Gold", 3)),
        (
            True,
            "high",
            SAGE_380,
            reel("Litespeed F (sealed)"),
            line("Avid Trout-Gold", 3),
        ),
        (False, "low", REDINGTON_486, reel("Liquid S"), line("Avid Trout-Gold", 4)),
        (False, "medium", REDINGTON_486, reel("Guru X"), line("Elite Gold", 4)),
        (False, "high", SAGE_486, reel("Litespeed F (sealed)"), line("Elite Gold", 4)),
    ],
)
def test_picks_match_the_spec(
    only_rod, budget, expected_rod, expected_reel, expected_line
):
    picks = picks_by_component(answers(only_rod=only_rod, budget=budget))
    assert picks["rod"].key == expected_rod
    assert picks["reel"].key == expected_reel
    assert picks["line"].key == expected_line


@pytest.mark.parametrize(
    "experience, expected_rod",
    [("low", SAGE_486), ("medium", SAGE_486), ("high", SAGE_CORE_486)],
)
def test_high_experience_gets_the_fast_rod_on_the_high_budget_4wt(
    experience, expected_rod
):
    picks = picks_by_component(
        answers(experience=experience, only_rod=False, budget="high")
    )
    assert picks["rod"].key == expected_rod


def test_high_experience_keeps_the_medium_rod_on_the_3wt():
    picks = picks_by_component(answers(experience="high", only_rod=True, budget="high"))
    assert picks["rod"].key == SAGE_380


@pytest.mark.parametrize("combo", ALL_ANSWERS)
def test_every_combination_gets_the_same_leader_and_tippet(combo):
    picks = picks_by_component(combo)
    assert picks["leader"].key == {
        "brand": "RIO",
        "name": "Powerflex Plus Trout Leader",
        "length_ft": Decimal("7.5"),
        "x_size": "5X",
        "pack_count": 3,
    }
    assert picks["tippet"].key == {
        "brand": "RIO",
        "name": "Powerflex Plus",
        "x_size": "5X",
    }


# ---------- Reasons ----------


@pytest.mark.parametrize("only_rod", [True, False])
def test_no_trout_adds_the_panfish_note(only_rod):
    without_trout = picks_by_component(answers(trout=False, only_rod=only_rod))[
        "rod"
    ].reason
    with_trout = picks_by_component(answers(trout=True, only_rod=only_rod))[
        "rod"
    ].reason
    assert "panfish" in without_trout
    assert "panfish" not in with_trout


@pytest.mark.parametrize("only_rod", [True, False])
def test_medium_budget_explains_where_the_money_went(only_rod):
    picks = picks_by_component(answers(only_rod=only_rod, budget="medium"))
    assert "budget" in picks["reel"].reason


def test_the_fast_rod_mentions_a_heavier_line():
    picks = picks_by_component(
        answers(experience="high", only_rod=False, budget="high")
    )
    assert "heavier line" in picks["line"].reason


def test_the_standard_rods_dont_mention_a_heavier_line():
    picks = picks_by_component(
        answers(experience="medium", only_rod=False, budget="high")
    )
    assert "heavier line" not in picks["line"].reason


def test_other_water_mentions_4x_tippet():
    assert "4X" in picks_by_component(answers(only_rod=False))["tippet"].reason
    assert "4X" not in picks_by_component(answers(only_rod=True))["tippet"].reason


def test_experience_changes_the_rod_reason():
    reasons = {
        experience: picks_by_component(answers(experience=experience))["rod"].reason
        for experience in ["low", "medium", "high"]
    }
    assert len(set(reasons.values())) == 3
