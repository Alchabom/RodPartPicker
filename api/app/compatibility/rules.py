"""Compatibility rules. Plain functions with no database or HTTP code."""

from dataclasses import dataclass
from enum import StrEnum

from app.parts.models import FlyLine, Leader, Reel, Rod, Tippet

SALT_MIN_WEIGHT = 7  # water=salt excludes anything under this weight
HEAVY_LEADER_LB = 10  # leaders at or above this strength count as heavy
HEAVY_LEADER_MIN_ROD_WEIGHT = 7  # heavy leaders only match rods at or above this weight


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


def effective_water(rod: Rod | None, requested: str | None) -> str | None:
    """Return the water to filter by: the request, else the rod's own tag."""
    if requested is not None:
        return requested
    if rod is not None and rod.water != "both":
        return rod.water
    return None


def passes_water(part_water: str, water: str | None) -> bool:
    """Check whether a part's water tag suits the effective water."""
    if water is None:
        return True
    if part_water == "both":
        return True
    return part_water == water


def rod_matches(rod: Rod, water: str | None, requested: str | None) -> bool:
    """Check whether a rod passes the water filter."""
    if not passes_water(rod.water, water):
        return False
    return not (requested == "salt" and rod.line_weight < SALT_MIN_WEIGHT)


def reel_matches(
    reel: Reel, rod: Rod | None, water: str | None, requested: str | None
) -> bool:
    """Check whether a reel fits the rod and the water filter."""
    if not passes_water(reel.water, water):
        return False
    if requested == "salt" and reel.max_line_weight < SALT_MIN_WEIGHT:
        return False
    if rod is None:
        return True
    return reel.min_line_weight <= rod.line_weight <= reel.max_line_weight


def line_matches(
    line: FlyLine, rod: Rod | None, water: str | None, requested: str | None
) -> bool:
    """Check whether a line fits the rod and the water filter."""
    if not passes_water(line.water, water):
        return False
    if requested == "salt" and line.line_weight < SALT_MIN_WEIGHT:
        return False
    if rod is None:
        return True
    return line.line_weight == rod.line_weight


def is_heavy_leader(leader: Leader) -> bool:
    """Check whether a leader is strong enough to count as heavy."""
    return leader.strength_lb is not None and leader.strength_lb >= HEAVY_LEADER_LB


def leader_matches(leader: Leader, rod: Rod | None, water: str | None) -> bool:
    """Check whether a leader fits the rod and the water filter."""
    if not passes_water(leader.water, water):
        return False
    if rod is None:
        return True
    return not (
        is_heavy_leader(leader) and rod.line_weight < HEAVY_LEADER_MIN_ROD_WEIGHT
    )


def is_recommended(line: FlyLine, rod: Rod, grains_max: int) -> bool:
    """Check whether a heavy line suits a fast rod. Assumes the line already matches."""
    return (
        rod.action == "fast"
        and line.head_weight_grains is not None
        and line.head_weight_grains > grains_max
    )


def check_build(
    rod: Rod | None,
    reel: Reel | None,
    line: FlyLine | None,
    leader: Leader | None,
    tippet: Tippet | None,
) -> list[BuildIssue]:
    """Return every compatibility warning for the selected parts."""
    issues: list[BuildIssue] = []

    if rod and line and rod.line_weight != line.line_weight:
        issues.append(
            BuildIssue(
                WarningCode.ROD_LINE_WEIGHT,
                f"This line is a {line.line_weight} wt, but your rod is a {rod.line_weight} wt.",
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
                f"This reel is rated for {reel.min_line_weight}-{reel.max_line_weight} wt, but your line is a {line.line_weight} wt.",
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
                f"This reel is rated for {reel.min_line_weight}-{reel.max_line_weight} wt, but your rod is a {rod.line_weight} wt.",
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
                f"This leader is too heavy for a {rod.line_weight} wt rod.",
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
                "This tippet doesn't suit your leader. Use the same size or one size finer.",
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
