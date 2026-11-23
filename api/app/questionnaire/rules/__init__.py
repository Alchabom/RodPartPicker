"""Questionnaire pick rules, one module per place. Plain data with no database or
HTTP code; the router resolves each pick's natural key to a catalog row.

Picks name catalog rows by natural key (brand, name and specs), so renaming a
catalog row means updating the module that picks it."""

from app.questionnaire.rules import creeks
from app.questionnaire.rules.common import Component, Level, Pick
from app.questionnaire.rules.creeks import CreekAnswers

__all__ = ["Component", "CreekAnswers", "Level", "Pick", "recommend"]


def recommend(answers: CreekAnswers) -> list[Pick]:
    """Return the five picks, in order rod, reel, line, leader, tippet."""
    return creeks.recommend(answers)
