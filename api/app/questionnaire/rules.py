"""Questionnaire pick rules: which catalog parts to recommend for a set of answers,
and why. Plain data with no database or HTTP code; the router resolves each pick's
natural key to a catalog row."""

from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

Level = Literal["low", "medium", "high"]
Component = Literal["rod", "reel", "line", "leader", "tippet"]


@dataclass(frozen=True)
class Answers:
    """The answers that change the setup. Only small creeks is supported, so the
    place isn't here yet."""

    experience: Level
    trout: bool
    only_rod: bool
    budget: Level


@dataclass(frozen=True)
class Pick:
    component: Component
    key: dict  # natural key: brand plus the columns that identify the row
    reason: str


def _rod(brand: str, name: str, weight: int, length_in: int) -> dict:
    return {"brand": brand, "name": name, "line_weight": weight, "length_in": length_in}


def _reel(name: str) -> dict:
    return {"brand": "Lamson", "name": name, "min_line_weight": 2, "max_line_weight": 4}


def _line(name: str, weight: int) -> dict:
    return {"brand": "RIO", "name": name, "line_weight": weight}


# ---------- Rods ----------

REDINGTON_376 = _rod("Redington", "Classic Trout 376-4", 3, 90)
REDINGTON_486 = _rod("Redington", "Classic Trout 486-4", 4, 102)
SAGE_380 = _rod("Sage", "Classic R8 380-4", 3, 96)
SAGE_486 = _rod("Sage", "Classic R8 486-4", 4, 102)
SAGE_CORE_486 = _rod("Sage", "R8 Core 486-4", 4, 102)

SHORT_3WT = (
    "A short 3wt is made for small creeks: it fits under overhanging branches, "
    "and small wild trout put a real bend in it."
)
VERSATILE_4WT = (
    "Since you'll fish other water too, an 8'6\" 4wt gives you more range: it still "
    "fits on small creeks but has the backbone for bigger rivers and wind."
)

ROD_REASONS = {
    REDINGTON_376["name"]: SHORT_3WT,
    SAGE_380["name"]: SHORT_3WT
    + " This one is a premium rod with a smooth, delicate feel.",
    REDINGTON_486["name"]: VERSATILE_4WT,
    SAGE_486["name"]: VERSATILE_4WT
    + " This one is a premium rod with a smooth, accurate feel.",
    SAGE_CORE_486["name"]: VERSATILE_4WT + " This one is a premium fast-action rod.",
}

# Every rod but the R8 Core is medium action
EXPERIENCE_NOTES = {
    "low": (
        "Since you're just starting out, its medium action bends deep, so you can "
        "feel the rod load while you learn to cast."
    ),
    "medium": "Its medium action is forgiving on the short, quick casts creeks call for.",
    "high": (
        "As an experienced caster, you'll appreciate how precisely its medium action "
        "puts a fly in tight spots."
    ),
}
FAST_ROD_NOTE = (
    "As an experienced caster, you'll get the most from a fast action's line speed "
    "and accuracy."
)
NO_TROUT_NOTE = (
    "This light setup is also a lot of fun with panfish and small bass in creeks."
)

# ---------- Reels ----------

BUDGET_NOTE = (
    "On small creeks the line and reel matter more than the rod, so we put your "
    "budget there."
)

REEL_REASONS = {
    "Liquid S": "A light, affordable reel rated for 2-4wt lines that balances a small-creek rod.",
    "Guru X": BUDGET_NOTE + " This reel has a smoother drag and is built to last.",
    "Litespeed F (sealed)": (
        "A premium, featherweight reel with a sealed drag that keeps out grit and water."
    ),
}

# ---------- Lines ----------

LINE_REASONS = {
    "Avid Trout-Gold": (
        "A floating trout line matched to your rod. Floating lines are the standard "
        "for dry flies and nymphs on small streams."
    ),
    "Elite Gold": (
        "A premium floating trout line that turns flies over smoothly at short and "
        "long range."
    ),
}
HEAVIER_LINE_NOTE = (
    "Fast rods like this one often cast even better with a slightly heavier line. "
    "To try one, look at the recommended heavier lines in the Line section."
)

# ---------- Leader and tippet ----------

LEADER = {
    "brand": "RIO",
    "name": "Powerflex Plus Trout Leader",
    "length_ft": Decimal("7.5"),
    "x_size": "5X",
    "pack_count": 3,
}
LEADER_REASON = (
    "A 7.5' 5X leader is long enough not to spook trout and short enough to cast "
    "easily under trees."
)

TIPPET = {"brand": "RIO", "name": "Powerflex Plus", "x_size": "5X"}
TIPPET_REASON = (
    "5X tippet matches your leader and is the go-to size for the small flies used "
    "on creeks."
)
BIGGER_FISH_NOTE = (
    "On bigger water with larger fish, step up to 4X tippet with a 4X leader."
)

# ---------- The table ----------

# (only_rod, budget) -> rod, reel, line
SETUPS = {
    (True, "low"): (REDINGTON_376, _reel("Liquid S"), _line("Avid Trout-Gold", 3)),
    (True, "medium"): (REDINGTON_376, _reel("Guru X"), _line("Avid Trout-Gold", 3)),
    (True, "high"): (
        SAGE_380,
        _reel("Litespeed F (sealed)"),
        _line("Avid Trout-Gold", 3),
    ),
    (False, "low"): (REDINGTON_486, _reel("Liquid S"), _line("Avid Trout-Gold", 4)),
    (False, "medium"): (REDINGTON_486, _reel("Guru X"), _line("Elite Gold", 4)),
    (False, "high"): (SAGE_486, _reel("Litespeed F (sealed)"), _line("Elite Gold", 4)),
}


def _join(*sentences: str | None) -> str:
    return " ".join(s for s in sentences if s)


def recommend(answers: Answers) -> list[Pick]:
    """Return the five picks, in order rod, reel, line, leader, tippet."""
    rod, reel, line = SETUPS[(answers.only_rod, answers.budget)]
    fast = rod == SAGE_486 and answers.experience == "high"
    if fast:
        rod = SAGE_CORE_486

    rod_reason = _join(
        ROD_REASONS[rod["name"]],
        FAST_ROD_NOTE if fast else EXPERIENCE_NOTES[answers.experience],
        None if answers.trout else NO_TROUT_NOTE,
    )
    return [
        Pick("rod", rod, rod_reason),
        Pick("reel", reel, REEL_REASONS[reel["name"]]),
        Pick(
            "line",
            line,
            _join(LINE_REASONS[line["name"]], HEAVIER_LINE_NOTE if fast else None),
        ),
        Pick("leader", LEADER, LEADER_REASON),
        Pick(
            "tippet",
            TIPPET,
            _join(TIPPET_REASON, None if answers.only_rod else BIGGER_FISH_NOTE),
        ),
    ]
