"""Compatibility rules. Plain functions with no database or HTTP code."""

from dataclasses import dataclass
from enum import StrEnum

from app.parts.models import (
    CatalogPart,
    FlyLine,
    Leader,
    LineWeight,
    Reel,
    Rod,
    Tippet,
)

SALT_MIN_WEIGHT = 7  # water=salt excludes anything under this weight
HEAVY_LEADER_LB = 10  # leaders at or above this strength count as heavy
HEAVY_LEADER_MIN_ROD_WEIGHT = 7  # heavy leaders only match rods at or above this weight
LIGHT_TIPPET_X_SIZE_ID = 8  # 4X; x_sizes ids rise as tippet gets finer
# Rods under this weight highlight every tippet; rods at or above it skip light tippets
LIGHT_TIPPET_MIN_ROD_WEIGHT = 7
# How far a heavier line must sit from its weight's target toward its grains_min:
# 0 allows anything under target, 1 only lines at grains_min
HEAVIER_LINE_FRACTION = 0.5


class WarningCode(StrEnum):
    ROD_LINE_WEIGHT = "ROD_LINE_WEIGHT"
    REEL_LINE_WEIGHT = "REEL_LINE_WEIGHT"
    ROD_REEL_WEIGHT = "ROD_REEL_WEIGHT"
    ROD_LEADER_WEIGHT = "ROD_LEADER_WEIGHT"
    LEADER_TIPPET_SIZE = "LEADER_TIPPET_SIZE"
    WATER_MISMATCH = "WATER_MISMATCH"


@dataclass(frozen=True)
class BuildIssue:
    code: WarningCode
    message: str


def passes_water(part_water: str, water: str | None) -> bool:
    """Check whether a part's water tag suits the effective water."""
    if water is None:
        return True
    if part_water == "both":
        return True
    return part_water == water


def passes_filter(
    part_water: str, top_weight: int | None, requested: str | None
) -> bool:
    """Apply the water parameter. Only water=salt enforces a minimum weight."""
    if not passes_water(part_water, requested):
        return False
    if requested != "salt" or top_weight is None:
        return True
    return top_weight >= SALT_MIN_WEIGHT


def is_heavy_leader(leader: Leader) -> bool:
    """Check whether a leader is strong enough to count as heavy."""
    return leader.strength_lb is not None and leader.strength_lb >= HEAVY_LEADER_LB


def highlights_every_tippet(rod: Rod) -> bool:
    """Check whether a rod is light enough to highlight every tippet."""
    return rod.line_weight < LIGHT_TIPPET_MIN_ROD_WEIGHT


def is_light_tippet_for_rod(tippet: Tippet, rod: Rod) -> bool:
    """Check whether a tippet is 4X or finer on a heavy rod.

    These still fit the build, so they aren't flagged, just not highlighted.
    """
    return (
        rod.line_weight >= LIGHT_TIPPET_MIN_ROD_WEIGHT
        and tippet.x_size_id >= LIGHT_TIPPET_X_SIZE_ID
    )


def is_recommended(line: FlyLine, rod: Rod, grains_max: int) -> bool:
    """Check whether a heavy line suits a fast rod. Assumes the line already matches."""
    return (
        rod.action == "fast"
        and line.head_weight_grains is not None
        and line.head_weight_grains > grains_max
    )


def heavier_line_cutoff(weight: LineWeight) -> float:
    """Return the most grains a line of this weight can have to count as heavier."""
    gap = weight.grains_target - weight.grains_min
    return weight.grains_target - HEAVIER_LINE_FRACTION * gap


def is_heavier_recommendation(line: FlyLine, rod: Rod, weight: LineWeight) -> bool:
    """Check whether a line one weight up suits a fast rod.

    `weight` is the line_weights row for the rod's weight plus one. A line on
    the light side of that weight loads a fast rod without overpowering it.
    """
    return (
        rod.action == "fast"
        and line.line_weight == rod.line_weight + 1
        and line.head_weight_grains is not None
        and line.head_weight_grains <= heavier_line_cutoff(weight)
    )


def check_build(
    rod: Rod | None = None,
    reel: Reel | None = None,
    line: FlyLine | None = None,
    leader: Leader | None = None,
    tippet: Tippet | None = None,
    heavier_line: bool = False,
) -> list[BuildIssue]:
    """Return every compatibility warning for the selected parts.

    `heavier_line` is True when the line is a heavier recommendation for the
    rod (see is_heavier_recommendation), so its weight doesn't warn.
    """
    issues: list[BuildIssue] = []

    if rod and line and rod.line_weight != line.line_weight and not heavier_line:
        issues.append(
            BuildIssue(
                WarningCode.ROD_LINE_WEIGHT,
                f"{line.name} is {line.line_weight} wt, but your rod is {rod.line_weight} wt.",
            )
        )

    if (
        reel
        and line
        and not reel.min_line_weight <= line.line_weight <= reel.max_line_weight
    ):
        issues.append(
            BuildIssue(
                WarningCode.REEL_LINE_WEIGHT,
                f"{reel.name} is rated for {reel.min_line_weight}-{reel.max_line_weight} wt, but your line is {line.line_weight} wt.",
            )
        )

    if (
        rod
        and reel
        and not reel.min_line_weight <= rod.line_weight <= reel.max_line_weight
    ):
        issues.append(
            BuildIssue(
                WarningCode.ROD_REEL_WEIGHT,
                f"{reel.name} is rated for {reel.min_line_weight}-{reel.max_line_weight} wt, but your rod is {rod.line_weight} wt.",
            )
        )

    if (
        rod
        and leader
        and is_heavy_leader(leader)
        and rod.line_weight < HEAVY_LEADER_MIN_ROD_WEIGHT
    ):
        issues.append(
            BuildIssue(
                WarningCode.ROD_LEADER_WEIGHT,
                f"{leader.name} is too heavy for a {rod.line_weight} wt rod.",
            )
        )

    if (
        leader
        and tippet
        and leader.x_size_id is not None
        and tippet.x_size_id not in (leader.x_size_id, leader.x_size_id + 1)
    ):
        issues.append(
            BuildIssue(
                WarningCode.LEADER_TIPPET_SIZE,
                f"{tippet.name} doesn't suit {leader.name}. Use the same size or one size finer.",
            )
        )

    parts = (rod, reel, line, leader, tippet)
    tags = {part.water for part in parts if part is not None}
    if {"fresh", "salt"} <= tags:
        issues.append(
            BuildIssue(
                WarningCode.WATER_MISMATCH,
                "This build mixes freshwater and saltwater parts.",
            )
        )

    return issues


def conflicts(slot: str, part: CatalogPart, selected: dict) -> bool:
    """Check whether a part warns against any selected part in another slot.

    Parts are compared one pair at a time, so a clash between two other parts
    doesn't count against this one. `slot` is a check_build argument name.
    """
    return any(
        check_build(**{slot: part, other_slot: other})
        for other_slot, other in selected.items()
        if other_slot != slot and other is not None
    )
