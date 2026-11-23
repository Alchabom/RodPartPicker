"""Large rivers pick rules. The target and flies set the rod weight and line type,
the budget sets the tier, and experience picks the rod action where a tier offers
both. See docs/superpowers/specs/2026-11-23-large-rivers-questionnaire-design.md."""

from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

from app.questionnaire.rules.common import HEAVIER_LINE_NOTE, Level, Pick, _join

Target = Literal["trout", "smallmouth", "predators"]
Flies = Literal[
    "dries_nymphs",
    "small_streamers",
    "large_streamers",
    "large_topwater",
    "unweighted",
    "weighted",
    "both",
]
Action = Literal["medium", "fast"]

# The flies each target offers; the schema checks answers against this
FLIES_BY_TARGET: dict[Target, tuple[Flies, ...]] = {
    "trout": ("dries_nymphs", "small_streamers", "large_streamers"),
    "smallmouth": ("small_streamers", "large_topwater"),
    "predators": ("unweighted", "weighted", "both"),
}


@dataclass(frozen=True)
class RiverAnswers:
    """The answers that change a large rivers setup."""

    experience: Level
    target: Target
    flies: Flies
    budget: Level


@dataclass(frozen=True)
class Rod:
    key: dict
    action: Action


def _rod(brand: str, name: str, weight: int, action: Action) -> Rod:
    key = {"brand": brand, "name": name, "line_weight": weight, "length_in": 108}
    return Rod(key, action)


def _reel(brand: str, name: str, min_weight: int, max_weight: int) -> dict:
    return {
        "brand": brand,
        "name": name,
        "min_line_weight": min_weight,
        "max_line_weight": max_weight,
    }


def _line(brand: str, name: str, weight: int) -> dict:
    return {"brand": brand, "name": name, "line_weight": weight}


def _leader(
    brand: str, name: str, length_ft: str, x_size: str | None, pack: int
) -> dict:
    return {
        "brand": brand,
        "name": name,
        "length_ft": Decimal(length_ft),
        "x_size": x_size,
        "pack_count": pack,
    }


def _tippet(name: str, x_size: str | None) -> dict:
    return {"brand": "RIO", "name": name, "x_size": x_size}


# ---------- Rod weight ----------

# (target, flies) -> rod weight. Every rod is 9'.
WEIGHTS: dict[tuple[Target, Flies], int] = {
    ("trout", "dries_nymphs"): 5,
    ("trout", "small_streamers"): 6,
    ("trout", "large_streamers"): 7,
    ("smallmouth", "small_streamers"): 7,
    ("smallmouth", "large_topwater"): 8,
    ("predators", "unweighted"): 10,
    ("predators", "weighted"): 10,
    ("predators", "both"): 10,
}

WEIGHT_REASONS: dict[tuple[Target, Flies], str] = {
    ("trout", "dries_nymphs"): (
        "A 9' 5wt is the classic big-river trout rod: long enough to mend line "
        "across currents and reach rising fish, light enough for small dries and "
        "nymph rigs."
    ),
    ("trout", "small_streamers"): (
        "A 9' 6wt has the backbone to cast small and medium streamers all day and "
        "to fight trout in heavy current, and it still handles nymphs."
    ),
    ("trout", "large_streamers"): (
        "Large streamers are heavy and catch the wind, so a 9' 7wt is the lightest "
        "rod that casts them comfortably and moves big trout."
    ),
    ("smallmouth", "small_streamers"): (
        "Smallmouth pull hard and their flies are bulky, so a 9' 7wt is the standard "
        "river bass rod: it turns over streamers and handles wind on open water."
    ),
    ("smallmouth", "large_topwater"): (
        "Big streamers and heavy topwater bugs take a 9' 8wt to cast well, and it has "
        "the power to pull a big smallmouth out of current."
    ),
    **{
        ("predators", flies): (
            "Musky and pike flies are huge and the fish are big and strong, so a 9' "
            "10wt is the standard: it casts big flies all day and has the power for a "
            "figure-8 at the boat and a long fight."
        )
        for flies in FLIES_BY_TARGET["predators"]
    },
}

# ---------- Rods ----------

# (weight, budget) -> (medium-action rod, fast rod). One rod: the tier has no choice.
RODS: dict[tuple[int, Level], tuple[Rod, ...]] = {
    (5, "low"): (_rod("Redington", "Classic Trout 590-4", 5, "medium"),),
    (5, "medium"): (
        _rod("Orvis", "Clearwater", 5, "medium"),
        _rod("Redington", "EDC 590-4", 5, "fast"),
    ),
    (5, "high"): (
        _rod("Sage", "Classic R8 590-4", 5, "medium"),
        _rod("Sage", "R8 Core 590-4", 5, "fast"),
    ),
    (6, "low"): (_rod("Redington", "Classic Trout 690-4", 6, "medium"),),
    (6, "medium"): (
        _rod("Orvis", "Clearwater", 6, "medium"),
        _rod("Redington", "EDC 690-4", 6, "fast"),
    ),
    (6, "high"): (
        _rod("Sage", "Classic R8 690-4", 6, "medium"),
        _rod("Sage", "R8 Core 690-4", 6, "fast"),
    ),
    (7, "low"): (_rod("Lamson", "liquid", 7, "medium"),),
    (7, "medium"): (
        _rod("Orvis", "Clearwater", 7, "medium"),
        _rod("Redington", "EDC 790-4", 7, "fast"),
    ),
    (7, "high"): (_rod("Sage", "R8 Core 790-4", 7, "fast"),),
    (8, "low"): (_rod("Lamson", "liquid", 8, "medium"),),
    (8, "medium"): (
        _rod("Orvis", "Clearwater", 8, "medium"),
        _rod("Redington", "EDC 890-4", 8, "fast"),
    ),
    (8, "high"): (_rod("Sage", "R8 Core 890-4", 8, "fast"),),
    (10, "low"): (_rod("Orvis", "Clearwater", 10, "medium"),),
    (10, "medium"): (_rod("Lamson", "liquid max", 10, "fast"),),
    (10, "high"): (_rod("Orvis", "Helios D", 10, "fast"),),
}

ROD_BUDGET_NOTES: dict[Level, str] = {
    "low": "It's an affordable rod that will last for years.",
    "medium": "It's a step up in feel and durability from entry-level rods.",
    "high": "It's a premium rod, light in the hand and precise.",
}

# (action, experience) -> how the action suits the caster
ACTION_NOTES: dict[tuple[Action, Level], str] = {
    ("medium", "low"): (
        "Since you're just starting out, its medium action bends deep, so you can "
        "feel the rod load while you learn to cast."
    ),
    (
        "medium",
        "medium",
    ): "Its medium action is forgiving and easy to time, cast after cast.",
    ("medium", "high"): "Its medium action is smooth and easy to fish all day.",
    ("fast", "low"): (
        "It's a fast-action rod. It takes a little more timing to cast, but that "
        "power is what carries heavy flies and line."
    ),
    ("fast", "medium"): (
        "It's a fast-action rod. It takes a little more timing to cast, but that "
        "power is what carries heavy flies and line."
    ),
    ("fast", "high"): (
        "As an experienced caster, you'll get the most from a fast action's line "
        "speed: it punches big flies into the wind."
    ),
}

# ---------- Reels ----------

# (reel band, budget) -> reel. Bands: 5-6wt, 7-8wt, 10wt.
REELS: dict[tuple[int, Level], dict] = {
    (6, "low"): _reel("Lamson", "Liquid S", 4, 6),
    (6, "medium"): _reel("Lamson", "Guru X", 4, 6),
    (6, "high"): _reel("Lamson", "Litespeed F (sealed)", 4, 6),
    (8, "low"): _reel("Lamson", "Liquid S", 6, 8),
    (8, "medium"): _reel("Lamson", "Guru X", 6, 8),
    (8, "high"): _reel("Lamson", "Litespeed F (sealed)", 6, 8),
    (10, "low"): _reel("Lamson", "Liquid S", 8, 10),
    (10, "medium"): _reel("Lamson", "Guru X", 8, 10),
    (10, "high"): _reel("Orvis", "Ratio (sealed)", 9, 11),
}

REEL_REASONS: dict[str, str] = {
    "Liquid S": "A light, affordable reel rated for your rod's weight.",
    "Guru X": (
        "A reel with a smoother drag that's built to last, worth having when a big "
        "fish runs in current."
    ),
    "Litespeed F (sealed)": (
        "A premium, featherweight reel with a sealed drag that keeps out grit and water."
    ),
    "Ratio (sealed)": (
        "A premium reel with a sealed drag strong enough to stop a big musky."
    ),
}


def _band(weight: int) -> int:
    return 6 if weight <= 6 else 8 if weight <= 8 else 10


# ---------- Lines ----------

AVID = "Avid Trout-Gold"
ELITE = "Elite Gold"

# (target, flies) -> the line when it isn't a floating Gold line (same at every budget)
SPECIAL_LINES: dict[tuple[Target, Flies], dict] = {
    ("trout", "large_streamers"): _line(
        "Scientific Anglers", "Sonar Titan Sink Tip (Sink 3)", 7
    ),
    ("predators", "unweighted"): _line(
        "Scientific Anglers", "Sonar Titan Sink Tip (Sink 6)", 10
    ),
    ("predators", "weighted"): _line("RIO", "Elite Predator", 10),
    ("predators", "both"): _line(
        "Scientific Anglers", "Sonar Titan Sink Tip (Int)", 10
    ),
}

LINE_REASONS: dict[str, str] = {
    AVID: (
        "A floating line matched to your rod. A floating line handles dries, nymphs "
        "and flies fished near the surface, so it's the one to start with."
    ),
    ELITE: (
        "A premium floating line matched to your rod that turns flies over smoothly "
        "at short and long range."
    ),
    "Sonar Titan Sink Tip (Sink 3)": (
        "A sink-tip line gets large streamers down to where big trout hold along the "
        "banks and in deeper runs, while the floating rest of the line stays easy to "
        "mend and pick up."
    ),
    "Sonar Titan Sink Tip (Sink 6)": (
        "Unweighted musky flies won't sink on their own, so a fast-sinking tip pulls "
        "them down into the strike zone."
    ),
    "Elite Predator": (
        "Your heavily weighted flies sink on their own, so a floating line keeps them "
        "out of snags and lets you work them with long pauses. Its short, heavy head "
        "turns over huge flies."
    ),
    "Sonar Titan Sink Tip (Int)": (
        "For a mix of flies, an intermediate tip sinks slowly: it keeps unweighted "
        "flies just under the surface without dragging weighted ones into snags."
    ),
}


def _gold_line(weight: int, budget: Level) -> dict:
    # Avid Trout-Gold stops at 7wt, so the 8wt is Elite Gold at every budget
    name = AVID if budget == "low" and weight <= 7 else ELITE
    return _line("RIO", name, weight)


# ---------- Leader and tippet ----------

POWERFLEX_LEADER = "Powerflex Plus Trout Leader"
STRONG = "Powerflex Strong"

# (target, flies) -> (leader, leader reason, tippet, tippet reason)
TERMINAL: dict[tuple[Target, Flies], tuple[dict, str, dict, str]] = {
    ("trout", "dries_nymphs"): (
        _leader("RIO", POWERFLEX_LEADER, "9.0", "5X", 3),
        (
            "A 9' 5X leader is long enough for wary river trout and suits the small dries "
            "and nymphs you'll fish."
        ),
        _tippet(STRONG, "5X"),
        (
            "5X tippet matches your leader. Tie on fresh tippet as you change flies, so "
            "the leader lasts."
        ),
    ),
    ("trout", "small_streamers"): (
        _leader("RIO", POWERFLEX_LEADER, "9.0", "3X", 3),
        (
            "A 9' 3X leader is strong enough for streamers and big trout, and long enough "
            "to fish nymphs too."
        ),
        _tippet(STRONG, "3X"),
        "3X tippet matches your leader, so you can rebuild the end as you change flies.",
    ),
    ("trout", "large_streamers"): (
        _leader("Scientific Anglers", "Absolute Streamer Leader", "4.0", None, 1),
        (
            "With a sink-tip line, a short, stout leader keeps the fly down with the tip, "
            "where a long leader would let it float back up."
        ),
        _tippet(STRONG, "3X"),
        (
            "3X tippet is strong enough to turn over heavy streamers and hold a big trout "
            "in current."
        ),
    ),
    **{
        ("smallmouth", flies): (
            _leader("RIO", POWERFLEX_LEADER, "9.0", "0X", 3),
            (
                "A 9' 0X leader turns over bulky bass flies and is strong enough to pull "
                "smallmouth away from rocks and wood."
            ),
            _tippet(STRONG, "0X"),
            (
                "0X tippet matches your leader, so you can rebuild the end as you change "
                "flies."
            ),
        )
        for flies in FLIES_BY_TARGET["smallmouth"]
    },
    **{
        ("predators", flies): (
            _leader("RIO", "Pike/Musky Leader", "6.0", None, 1),
            (
                "Big musky flies need a heavy leader to turn over, and its 60 lb "
                "fluorocarbon end stands up to rough mouths."
            ),
            _tippet("Powerflex Wire Bite Tippet", None),
            (
                "Musky and pike teeth cut through nylon and fluorocarbon, so finish with a "
                "short piece of wire bite tippet, which you can knot straight to the fly."
            ),
        )
        for flies in FLIES_BY_TARGET["predators"]
    },
}


def recommend(answers: RiverAnswers) -> list[Pick]:
    """Return the five picks, in order rod, reel, line, leader, tippet."""
    pair = (answers.target, answers.flies)
    weight = WEIGHTS[pair]

    choices = RODS[(weight, answers.budget)]
    rod = choices[-1] if answers.experience == "high" else choices[0]
    rod_reason = _join(
        WEIGHT_REASONS[pair],
        ROD_BUDGET_NOTES[answers.budget],
        ACTION_NOTES[(rod.action, answers.experience)],
    )

    reel = REELS[(_band(weight), answers.budget)]

    line = SPECIAL_LINES.get(pair) or _gold_line(weight, answers.budget)
    # There's no 9wt freshwater line, so the note only helps up to 7wt
    heavier = rod.action == "fast" and line["name"] in (AVID, ELITE) and weight < 8
    line_reason = _join(
        LINE_REASONS[line["name"]], HEAVIER_LINE_NOTE if heavier else None
    )

    leader, leader_reason, tippet, tippet_reason = TERMINAL[pair]
    return [
        Pick("rod", rod.key, rod_reason),
        Pick("reel", reel, REEL_REASONS[reel["name"]]),
        Pick("line", line, line_reason),
        Pick("leader", leader, leader_reason),
        Pick("tippet", tippet, tippet_reason),
    ]
