"""Tests for the compatibility rules. These use unsaved objects, so no database."""

from decimal import Decimal

import pytest

from app.compatibility import rules
from app.parts.models import FlyLine, Leader, Reel, Rod

# ---------- Water ----------


@pytest.mark.parametrize(
    "rod_water, requested, expected",
    [
        (None, None, None),  # no rod and no parameter: no filter
        (None, "salt", "salt"),  # no rod: the parameter decides
        ("fresh", None, "fresh"),  # the rod's own tag
        ("salt", None, "salt"),
        ("both", None, None),  # a both rod doesn't say which water
        ("both", "salt", "salt"),
        ("fresh", "salt", "salt"),  # the parameter beats the rod's tag
    ],
)
def test_effective_water(rod_water, requested, expected):
    rod = Rod(water=rod_water) if rod_water else None

    assert rules.effective_water(rod, requested) == expected


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


# ---------- Rods ----------


@pytest.mark.parametrize(
    "rod_water, water, expected",
    [("fresh", "fresh", True), ("both", "salt", True), ("fresh", "salt", False)],
)
def test_rod_matches_water(rod_water, water, expected):
    rod = Rod(line_weight=8, water=rod_water)

    assert rules.rod_matches(rod, water, None) is expected


@pytest.mark.parametrize("weight, expected", [(6, False), (7, True)])
def test_rod_salt_minimum(weight, expected):
    rod = Rod(line_weight=weight, water="salt")

    assert rules.rod_matches(rod, "salt", "salt") is expected


# ---------- Reels ----------


@pytest.mark.parametrize(
    "rod_weight, expected", [(3, False), (4, True), (6, True), (7, False)]
)
def test_reel_matches_rods_within_its_range(rod_weight, expected):
    rod = Rod(line_weight=rod_weight, water="fresh")
    reel = Reel(min_line_weight=4, max_line_weight=6, water="fresh")

    assert rules.reel_matches(reel, rod, "fresh", None) is expected


def test_reel_must_pass_water():
    rod = Rod(line_weight=8, water="fresh")
    reel = Reel(min_line_weight=7, max_line_weight=9, water="salt")

    assert rules.reel_matches(reel, rod, "fresh", None) is False


@pytest.mark.parametrize("max_weight, expected", [(6, False), (7, True)])
def test_reel_salt_minimum_with_no_rod(max_weight, expected):
    reel = Reel(min_line_weight=4, max_line_weight=max_weight, water="salt")

    assert rules.reel_matches(reel, None, "salt", "salt") is expected


def test_reel_with_no_rod_needs_only_water():
    reel = Reel(min_line_weight=4, max_line_weight=6, water="fresh")

    assert rules.reel_matches(reel, None, None, None) is True


def test_salt_minimum_skipped_when_salt_comes_from_the_rod():
    rod = Rod(line_weight=6, water="salt")
    reel = Reel(min_line_weight=5, max_line_weight=6, water="salt")

    assert rules.reel_matches(reel, rod, "salt", None) is True


# ---------- Lines ----------


@pytest.mark.parametrize("line_weight, expected", [(4, False), (5, True), (6, False)])
def test_line_matches_only_the_rods_weight(line_weight, expected):
    rod = Rod(line_weight=5, water="fresh")
    line = FlyLine(line_weight=line_weight, water="fresh")

    assert rules.line_matches(line, rod, "fresh", None) is expected


def test_line_must_pass_water():
    rod = Rod(line_weight=6, water="fresh")
    line = FlyLine(line_weight=6, water="salt")

    assert rules.line_matches(line, rod, "fresh", None) is False


@pytest.mark.parametrize("weight, expected", [(6, False), (7, True)])
def test_line_salt_minimum(weight, expected):
    rod = Rod(line_weight=weight, water="salt")
    line = FlyLine(line_weight=weight, water="salt")

    assert rules.line_matches(line, rod, "salt", "salt") is expected


def test_line_salt_minimum_skipped_when_salt_comes_from_the_rod():
    rod = Rod(line_weight=6, water="salt")
    line = FlyLine(line_weight=6, water="salt")

    assert rules.line_matches(line, rod, "salt", None) is True


def test_line_with_no_rod_needs_only_water():
    line = FlyLine(line_weight=5, water="fresh")

    assert rules.line_matches(line, None, "fresh", None) is True
    assert rules.line_matches(line, None, "salt", None) is False


# ---------- Leaders ----------


@pytest.mark.parametrize(
    "strength_lb, expected",
    [(Decimal("9.9"), False), (Decimal("10.0"), True), (None, False)],
)
def test_is_heavy_leader(strength_lb, expected):
    assert rules.is_heavy_leader(Leader(strength_lb=strength_lb)) is expected


@pytest.mark.parametrize("rod_weight, expected", [(6, False), (7, True)])
def test_heavy_leader_needs_a_7wt_rod(rod_weight, expected):
    rod = Rod(line_weight=rod_weight, water="fresh")
    leader = Leader(strength_lb=Decimal("10.0"), water="fresh")

    assert rules.leader_matches(leader, rod, "fresh") is expected


def test_light_leader_fits_a_light_rod():
    rod = Rod(line_weight=3, water="fresh")
    leader = Leader(strength_lb=Decimal("5.9"), water="fresh")

    assert rules.leader_matches(leader, rod, "fresh") is True


def test_leader_must_pass_water():
    rod = Rod(line_weight=8, water="salt")
    leader = Leader(strength_lb=Decimal("5.9"), water="fresh")

    assert rules.leader_matches(leader, rod, "salt") is False


def test_heavy_leader_with_no_rod_needs_only_water():
    leader = Leader(strength_lb=Decimal("12.0"), water="salt")

    assert rules.leader_matches(leader, None, "salt") is True


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
