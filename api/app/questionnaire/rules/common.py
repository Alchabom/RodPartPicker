"""Types and helpers every place's pick rules share."""

from dataclasses import dataclass
from typing import Literal

Level = Literal["low", "medium", "high"]
Component = Literal["rod", "reel", "line", "leader", "tippet"]


@dataclass(frozen=True)
class Pick:
    component: Component
    key: dict  # natural key: brand plus the columns that identify the row
    reason: str


HEAVIER_LINE_NOTE = (
    "Fast rods like this one often cast even better with a slightly heavier line. "
    "To try one, look at the recommended heavier lines in the Line section."
)


def _join(*sentences: str | None) -> str:
    return " ".join(s for s in sentences if s)
