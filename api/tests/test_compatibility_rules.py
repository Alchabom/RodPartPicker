"""Tests for the compatibility rules. These use unsaved objects, so no database."""

from decimal import Decimal

import pytest

from app.compatibility import rules
from app.parts.models import FlyLine, Leader, Reel, Rod, Tippet

# ---------- Water ----------


@pytest.mark.parametrize(
    "part_water, water, expected",
    [
        ("fresh", "fresh", True),
        ("salt", "salt", True),
        ("both", "fresh", True),
        ("both", "salt", True),
        ("fresh", "salt", False),
        ("salt", "fresh", False),
        ("fresh", None, True),  # no effective water: everything passes
        ("salt", None, True),
    ],
)
def test_passes_water(part_water, water, expected):
    assert rules.passes_water(part_water, water) is expected


# ---------- Leaders ----------


@pytest.mark.parametrize(
    "strength_lb, expected",
    [(Decimal("9.9"), False), (Decimal("10.0"), True), (None, False)],
)
def test_is_heavy_leader(strength_lb, expected):
    assert rules.is_heavy_leader(Leader(strength_lb=strength_lb)) is expected


# ---------- Recommended lines ----------

GRAINS_MAX = 146  # the top of the 5 wt range


@pytest.mark.parametrize(
    "head_grains, expected",
    [(GRAINS_MAX, False), (GRAINS_MAX + 1, True), (None, False)],
)
def test_only_heavy_lines_are_recommended(head_grains, expected):
    rod = Rod(action="fast")
    line = FlyLine(head_weight_grains=head_grains)

    assert rules.is_recommended(line, rod, GRAINS_MAX) is expected


@pytest.mark.parametrize("action", ["slow", "medium", None])
def test_heavy_line_is_not_recommended_on_other_rods(action):
    rod = Rod(action=action)
    line = FlyLine(head_weight_grains=GRAINS_MAX + 1)

    assert rules.is_recommended(line, rod, GRAINS_MAX) is False


# ---------- Filter ----------


@pytest.mark.parametrize(
    "part_water, requested, expected",
    [
        ("fresh", None, True),  # no parameter: nothing is filtered
        ("salt", None, True),
        ("fresh", "fresh", True),
        ("both", "salt", True),
        ("fresh", "salt", False),
        ("salt", "fresh", False),
    ],
)
def test_passes_filter_water(part_water, requested, expected):
    assert rules.passes_filter(part_water, 8, requested) is expected


@pytest.mark.parametrize("top_weight, expected", [(6, False), (7, True), (None, True)])
def test_passes_filter_salt_minimum(top_weight, expected):
    assert rules.passes_filter("salt", top_weight, "salt") is expected


def test_salt_minimum_needs_the_parameter():
    assert rules.passes_filter("salt", 6, None) is True


# ---------- Conflicts ----------


def test_conflicts_with_a_selected_part():
    selected = {"rod": Rod(line_weight=5)}

    assert rules.conflicts("line", FlyLine(line_weight=6), selected) is True


def test_no_conflict_with_a_compatible_part():
    selected = {"rod": Rod(line_weight=5)}

    assert rules.conflicts("line", FlyLine(line_weight=5), selected) is False


def test_no_conflict_with_nothing_selected():
    selected = {"rod": None, "reel": None}

    assert rules.conflicts("line", FlyLine(line_weight=5), selected) is False


def test_clash_between_other_parts_is_ignored():
    selected = {
        "rod": Rod(line_weight=2),
        "reel": Reel(min_line_weight=6, max_line_weight=8),
    }

    assert rules.conflicts("leader", Leader(x_size_id=9), selected) is False


def test_part_is_not_checked_against_its_own_slot():
    selected = {"line": FlyLine(line_weight=8)}

    assert rules.conflicts("line", FlyLine(line_weight=5), selected) is False


# ---------- Build warnings ----------

HEAVY = Decimal("10.0")
LIGHT = Decimal("5.9")


def codes(rod=None, reel=None, line=None, leader=None, tippet=None):
    issues = rules.check_build(rod, reel, line, leader, tippet)
    return [issue.code for issue in issues]


def test_empty_build_has_no_warnings():
    assert codes() == []


def test_compatible_build_has_no_warnings():
    assert (
        codes(
            rod=Rod(line_weight=5, water="fresh"),
            reel=Reel(min_line_weight=4, max_line_weight=6, water="fresh"),
            line=FlyLine(line_weight=5, water="fresh"),
            leader=Leader(x_size_id=9, strength_lb=LIGHT, water="fresh"),
            tippet=Tippet(x_size_id=10, water="fresh"),
        )
        == []
    )


def test_every_warning_is_returned_with_a_message():
    issues = rules.check_build(
        Rod(line_weight=5, water="fresh"),
        Reel(min_line_weight=7, max_line_weight=9, water="fresh"),
        FlyLine(line_weight=8, water="salt"),
        None,
        None,
    )

    assert {issue.code for issue in issues} == {
        "ROD_LINE_WEIGHT",
        "ROD_REEL_WEIGHT",
        "WATER_MISMATCH",
    }
    assert all(issue.message for issue in issues)


def test_warning_names_the_part_to_change():
    reel = Reel(name="Guru X", min_line_weight=6, max_line_weight=8)

    issues = rules.check_build(rod=Rod(line_weight=2), reel=reel)

    assert issues[0].message == "Guru X is rated for 6-8 wt, but your rod is 2 wt."


@pytest.mark.parametrize("line_weight, expected", [(4, True), (5, False), (6, True)])
def test_rod_line_weight(line_weight, expected):
    rod = Rod(line_weight=5)
    line = FlyLine(line_weight=line_weight)

    assert ("ROD_LINE_WEIGHT" in codes(rod=rod, line=line)) is expected


@pytest.mark.parametrize(
    "line_weight, expected", [(3, True), (4, False), (6, False), (7, True)]
)
def test_reel_line_weight(line_weight, expected):
    reel = Reel(min_line_weight=4, max_line_weight=6)
    line = FlyLine(line_weight=line_weight)

    assert ("REEL_LINE_WEIGHT" in codes(reel=reel, line=line)) is expected


@pytest.mark.parametrize(
    "rod_weight, expected", [(3, True), (4, False), (6, False), (7, True)]
)
def test_rod_reel_weight(rod_weight, expected):
    rod = Rod(line_weight=rod_weight)
    reel = Reel(min_line_weight=4, max_line_weight=6)

    assert ("ROD_REEL_WEIGHT" in codes(rod=rod, reel=reel)) is expected


@pytest.mark.parametrize(
    "rod_weight, strength_lb, expected",
    [
        (6, HEAVY, True),
        (7, HEAVY, False),
        (6, LIGHT, False),
        (6, None, False),
    ],
)
def test_rod_leader_weight(rod_weight, strength_lb, expected):
    rod = Rod(line_weight=rod_weight)
    leader = Leader(strength_lb=strength_lb)

    assert ("ROD_LEADER_WEIGHT" in codes(rod=rod, leader=leader)) is expected


@pytest.mark.parametrize(
    "tippet_size, expected",
    [
        (8, True),  # one size heavier than the leader
        (9, False),  # the same size
        (10, False),  # one size finer
        (11, True),  # two sizes finer
    ],
)
def test_leader_tippet_size(tippet_size, expected):
    leader = Leader(x_size_id=9)
    tippet = Tippet(x_size_id=tippet_size)

    assert ("LEADER_TIPPET_SIZE" in codes(leader=leader, tippet=tippet)) is expected


def test_leader_tippet_size_skipped_when_leader_has_no_x_size():
    leader = Leader(x_size_id=None)
    tippet = Tippet(x_size_id=9)

    assert "LEADER_TIPPET_SIZE" not in codes(leader=leader, tippet=tippet)


@pytest.mark.parametrize(
    "rod_water, line_water, expected",
    [
        ("fresh", "salt", True),
        ("salt", "fresh", True),
        ("fresh", "fresh", False),
        ("salt", "salt", False),
        ("both", "salt", False),
        ("fresh", "both", False),
    ],
)
def test_water_mismatch(rod_water, line_water, expected):
    rod = Rod(line_weight=8, water=rod_water)
    line = FlyLine(line_weight=8, water=line_water)

    assert ("WATER_MISMATCH" in codes(rod=rod, line=line)) is expected


def test_water_mismatch_checks_every_part():
    leader = Leader(x_size_id=9, water="salt")
    tippet = Tippet(x_size_id=9, water="fresh")

    assert "WATER_MISMATCH" in codes(leader=leader, tippet=tippet)


def test_water_mismatch_fires_once_for_many_parts():
    found = codes(
        rod=Rod(line_weight=8, water="fresh"),
        line=FlyLine(line_weight=8, water="salt"),
        leader=Leader(x_size_id=9, water="salt"),
        tippet=Tippet(x_size_id=9, water="fresh"),
    )

    assert found.count("WATER_MISMATCH") == 1


@pytest.mark.parametrize(
    "parts",
    [
        {"rod": Rod(line_weight=5, water="fresh")},
        {"reel": Reel(min_line_weight=7, max_line_weight=9, water="salt")},
        {"line": FlyLine(line_weight=8, water="salt")},
        {"leader": Leader(x_size_id=9, strength_lb=HEAVY, water="salt")},
        {"tippet": Tippet(x_size_id=4, water="fresh")},
    ],
    ids=["rod", "reel", "line", "leader", "tippet"],
)
def test_one_part_alone_has_no_warnings(parts):
    assert codes(**parts) == []
