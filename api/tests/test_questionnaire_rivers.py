"""Tests for the large rivers pick rules. Plain data, so no database."""

import itertools
from decimal import Decimal

import pytest

from app.questionnaire import rules
from app.questionnaire.rules.rivers import FLIES_BY_TARGET, RiverAnswers

LEVELS = ("low", "medium", "high")
PAIRS = [
    (target, flies) for target, options in FLIES_BY_TARGET.items() for flies in options
]
COMBOS = [
    RiverAnswers(experience=e, target=t, flies=f, budget=b)
    for e, (t, f), b in itertools.product(LEVELS, PAIRS, LEVELS)
]


def answers(**overrides) -> RiverAnswers:
    base = {
        "experience": "medium",
        "target": "trout",
        "flies": "dries_nymphs",
        "budget": "low",
    }
    return RiverAnswers(**(base | overrides))


def picks(a: RiverAnswers) -> dict[str, rules.Pick]:
    return {pick.component: pick for pick in rules.recommend(a)}


def test_every_target_has_its_flies():
    assert FLIES_BY_TARGET == {
        "trout": ("dries_nymphs", "small_streamers", "large_streamers"),
        "smallmouth": ("small_streamers", "large_topwater"),
        "predators": ("unweighted", "weighted", "both"),
    }
    assert len(COMBOS) == 72


@pytest.mark.parametrize("combo", COMBOS)
def test_every_combination_gives_five_picks_with_reasons(combo):
    result = rules.recommend(combo)

    assert [pick.component for pick in result] == [
        "rod",
        "reel",
        "line",
        "leader",
        "tippet",
    ]
    assert all(pick.reason for pick in result)


@pytest.mark.parametrize(
    "target, flies, weight",
    [
        ("trout", "dries_nymphs", 5),
        ("trout", "small_streamers", 6),
        ("trout", "large_streamers", 7),
        ("smallmouth", "small_streamers", 7),
        ("smallmouth", "large_topwater", 8),
        ("predators", "unweighted", 10),
        ("predators", "weighted", 10),
        ("predators", "both", 10),
    ],
)
def test_target_and_flies_set_a_9ft_rod_weight_and_matching_line(target, flies, weight):
    for budget in LEVELS:
        p = picks(answers(target=target, flies=flies, budget=budget))
        assert p["rod"].key["line_weight"] == weight
        assert p["rod"].key["length_in"] == 108
        assert p["line"].key["line_weight"] == weight
        assert (
            p["reel"].key["min_line_weight"]
            <= weight
            <= p["reel"].key["max_line_weight"]
        )


@pytest.mark.parametrize(
    "weight_answers, budget, medium_rod, fast_rod",
    [
        (
            {"flies": "dries_nymphs"},
            "low",
            "Classic Trout 590-4",
            "Classic Trout 590-4",
        ),
        ({"flies": "dries_nymphs"}, "medium", "Clearwater", "EDC 590-4"),
        ({"flies": "dries_nymphs"}, "high", "Classic R8 590-4", "R8 Core 590-4"),
        (
            {"flies": "small_streamers"},
            "low",
            "Classic Trout 690-4",
            "Classic Trout 690-4",
        ),
        ({"flies": "small_streamers"}, "medium", "Clearwater", "EDC 690-4"),
        ({"flies": "small_streamers"}, "high", "Classic R8 690-4", "R8 Core 690-4"),
        ({"flies": "large_streamers"}, "low", "liquid", "liquid"),
        ({"flies": "large_streamers"}, "medium", "Clearwater", "EDC 790-4"),
        ({"flies": "large_streamers"}, "high", "R8 Core 790-4", "R8 Core 790-4"),
        (
            {"target": "smallmouth", "flies": "large_topwater"},
            "low",
            "liquid",
            "liquid",
        ),
        (
            {"target": "smallmouth", "flies": "large_topwater"},
            "medium",
            "Clearwater",
            "EDC 890-4",
        ),
        (
            {"target": "smallmouth", "flies": "large_topwater"},
            "high",
            "R8 Core 890-4",
            "R8 Core 890-4",
        ),
        ({"target": "predators", "flies": "both"}, "low", "Clearwater", "Clearwater"),
        (
            {"target": "predators", "flies": "both"},
            "medium",
            "liquid max",
            "liquid max",
        ),
        ({"target": "predators", "flies": "both"}, "high", "Helios D", "Helios D"),
    ],
)
def test_rods_follow_the_table(weight_answers, budget, medium_rod, fast_rod):
    # Low and medium experience get the medium-action rod, high experience the fast one
    for experience in ("low", "medium"):
        p = picks(answers(**weight_answers, budget=budget, experience=experience))
        assert p["rod"].key["name"] == medium_rod
    p = picks(answers(**weight_answers, budget=budget, experience="high"))
    assert p["rod"].key["name"] == fast_rod


@pytest.mark.parametrize(
    "weight_answers, budget, reel",
    [
        ({"flies": "dries_nymphs"}, "low", ("Lamson", "Liquid S", 4, 6)),
        ({"flies": "small_streamers"}, "medium", ("Lamson", "Guru X", 4, 6)),
        ({"flies": "dries_nymphs"}, "high", ("Lamson", "Litespeed F (sealed)", 4, 6)),
        ({"flies": "large_streamers"}, "low", ("Lamson", "Liquid S", 6, 8)),
        (
            {"target": "smallmouth", "flies": "large_topwater"},
            "high",
            ("Lamson", "Litespeed F (sealed)", 6, 8),
        ),
        (
            {"target": "predators", "flies": "weighted"},
            "medium",
            ("Lamson", "Guru X", 8, 10),
        ),
        (
            {"target": "predators", "flies": "weighted"},
            "high",
            ("Orvis", "Ratio (sealed)", 9, 11),
        ),
    ],
)
def test_reels_follow_the_table(weight_answers, budget, reel):
    key = picks(answers(**weight_answers, budget=budget))["reel"].key
    assert (
        key["brand"],
        key["name"],
        key["min_line_weight"],
        key["max_line_weight"],
    ) == reel


@pytest.mark.parametrize(
    "weight_answers, budget, line",
    [
        ({"flies": "dries_nymphs"}, "low", ("RIO", "Avid Trout-Gold")),
        ({"flies": "dries_nymphs"}, "medium", ("RIO", "Elite Gold")),
        (
            {"target": "smallmouth", "flies": "small_streamers"},
            "low",
            ("RIO", "Avid Trout-Gold"),
        ),
        (
            {"target": "smallmouth", "flies": "large_topwater"},
            "low",
            ("RIO", "Elite Gold"),
        ),
        (
            {"flies": "large_streamers"},
            "low",
            ("Scientific Anglers", "Sonar Titan Sink Tip (Sink 3)"),
        ),
        (
            {"flies": "large_streamers"},
            "high",
            ("Scientific Anglers", "Sonar Titan Sink Tip (Sink 3)"),
        ),
        (
            {"target": "predators", "flies": "unweighted"},
            "low",
            ("Scientific Anglers", "Sonar Titan Sink Tip (Sink 6)"),
        ),
        (
            {"target": "predators", "flies": "weighted"},
            "high",
            ("RIO", "Elite Predator"),
        ),
        (
            {"target": "predators", "flies": "both"},
            "medium",
            ("Scientific Anglers", "Sonar Titan Sink Tip (Int)"),
        ),
    ],
)
def test_lines_follow_the_table(weight_answers, budget, line):
    key = picks(answers(**weight_answers, budget=budget))["line"].key
    assert (key["brand"], key["name"]) == line


POWERFLEX = {
    "brand": "RIO",
    "name": "Powerflex Plus Trout Leader",
    "length_ft": Decimal("9.0"),
    "pack_count": 3,
}


@pytest.mark.parametrize(
    "weight_answers, leader, tippet",
    [
        (
            {"flies": "dries_nymphs"},
            POWERFLEX | {"x_size": "5X"},
            ("Powerflex Strong", "5X"),
        ),
        (
            {"flies": "small_streamers"},
            POWERFLEX | {"x_size": "3X"},
            ("Powerflex Strong", "3X"),
        ),
        (
            {"flies": "large_streamers"},
            {
                "brand": "Scientific Anglers",
                "name": "Absolute Streamer Leader",
                "length_ft": Decimal("4.0"),
                "x_size": None,
                "pack_count": 1,
            },
            ("Powerflex Strong", "3X"),
        ),
        (
            {"target": "smallmouth", "flies": "small_streamers"},
            POWERFLEX | {"x_size": "0X"},
            ("Powerflex Strong", "0X"),
        ),
        (
            {"target": "smallmouth", "flies": "large_topwater"},
            POWERFLEX | {"x_size": "0X"},
            ("Powerflex Strong", "0X"),
        ),
        (
            {"target": "predators", "flies": "unweighted"},
            {
                "brand": "RIO",
                "name": "Pike/Musky Leader",
                "length_ft": Decimal("6.0"),
                "x_size": None,
                "pack_count": 1,
            },
            ("Powerflex Wire Bite Tippet", None),
        ),
    ],
)
def test_leader_and_tippet_follow_the_table(weight_answers, leader, tippet):
    for budget in LEVELS:
        p = picks(answers(**weight_answers, budget=budget))
        assert p["leader"].key == leader
        assert (p["tippet"].key["name"], p["tippet"].key["x_size"]) == tippet


def test_high_experience_medium_budget_5wt_gets_the_fast_edc():
    p = picks(answers(experience="high", budget="medium"))
    assert p["rod"].key == {
        "brand": "Redington",
        "name": "EDC 590-4",
        "line_weight": 5,
        "length_in": 108,
    }


def test_rod_reason_follows_its_action_not_just_experience():
    # The high-budget 7wt is fast for everyone, so a beginner hears about a fast rod
    reason = picks(answers(experience="low", flies="large_streamers", budget="high"))[
        "rod"
    ].reason
    assert "fast" in reason
    assert "medium action" not in reason
    reason = picks(answers(experience="low"))["rod"].reason
    assert "medium action" in reason


def test_fast_rod_with_a_floating_gold_line_points_to_heavier_lines():
    p = picks(answers(experience="high", budget="high"))
    assert "heavier line" in p["line"].reason
    p = picks(answers(experience="medium", budget="high"))
    assert "heavier line" not in p["line"].reason


def test_musky_tippet_explains_the_wire():
    assert (
        "wire" in picks(answers(target="predators", flies="weighted"))["tippet"].reason
    )
