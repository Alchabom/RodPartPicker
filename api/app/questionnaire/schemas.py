from typing import Literal

from app.questionnaire.rules import Component, Level
from app.schemas import CamelModel


class AnswersQuery(CamelModel):
    """The questionnaire's answers, as query parameters. Only small creeks is supported."""

    experience: Level
    place: Literal["small_creeks"]
    trout: bool
    only_rod: bool
    budget: Level


class RecommendedPart(CamelModel):
    component: Component
    part_id: int
    reason: str


class Recommendation(CamelModel):
    """One part per component, in order rod, reel, line, leader, tippet."""

    parts: list[RecommendedPart]
