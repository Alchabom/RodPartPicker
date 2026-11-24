from typing import Literal, Self

from pydantic import model_validator

from app.questionnaire.rules import Component, Level
from app.questionnaire.rules.rivers import FLIES_BY_TARGET, Flies, Target
from app.schemas import CamelModel

PLACE_FIELDS = {
    "small_creeks": ("trout", "only_rod"),
    "large_rivers": ("target", "flies"),
}


class AnswersQuery(CamelModel):
    """The questionnaire's answers, as query parameters. Each place has its own
    follow-up answers: trout and onlyRod for small creeks, target and flies for
    large rivers."""

    experience: Level
    place: Literal["small_creeks", "large_rivers"]
    trout: bool | None = None
    only_rod: bool | None = None
    target: Target | None = None
    flies: Flies | None = None
    budget: Level

    @model_validator(mode="after")
    def check_place_answers(self) -> Self:
        for place, fields in PLACE_FIELDS.items():
            given = [getattr(self, field) is not None for field in fields]
            if place == self.place and not all(given):
                raise ValueError(f"{self.place} needs {' and '.join(fields)}")
            if place != self.place and any(given):
                raise ValueError(f"{self.place} doesn't take {' or '.join(fields)}")
        if self.target is not None and self.flies not in FLIES_BY_TARGET[self.target]:
            raise ValueError(f"{self.flies} isn't an answer for {self.target}")
        return self


class RecommendedPart(CamelModel):
    component: Component
    part_id: int
    reason: str


class Recommendation(CamelModel):
    """One part per component, in order rod, reel, line, leader, tippet."""

    parts: list[RecommendedPart]
