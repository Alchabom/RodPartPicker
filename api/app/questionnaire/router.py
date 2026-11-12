import logging
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from app.db import DbSession
from app.parts.models import Brand, FlyLine, Leader, Reel, Rod, Tippet, XSize
from app.questionnaire import rules
from app.questionnaire.schemas import AnswersQuery, Recommendation, RecommendedPart

router = APIRouter(prefix="/questionnaire", tags=["questionnaire"])

# uvicorn configures this logger, so the line shows in `fastapi dev` output
log = logging.getLogger("uvicorn.error")

MODELS = {"rod": Rod, "reel": Reel, "line": FlyLine, "leader": Leader, "tippet": Tippet}


def _find(db, pick: rules.Pick) -> int:
    """Return the ID of the catalog row that the pick's natural key names."""
    model = MODELS[pick.component]
    query = select(model.id).join(Brand).where(Brand.name == pick.key["brand"])
    for column, value in pick.key.items():
        if column == "brand":
            continue
        if column == "x_size":
            query = query.join(XSize).where(XSize.label == value)
        else:
            query = query.where(getattr(model, column) == value)

    # one_or_none raises if a key ever matches two rows, so tests catch it
    part_id = db.scalars(query).one_or_none()
    if part_id is None:
        log.error(
            "Questionnaire pick is missing from the catalog: %s %s",
            pick.component,
            pick.key,
        )
        raise HTTPException(
            status_code=500, detail="Recommended part is missing from the catalog"
        )
    return part_id


@router.get("/recommend")
def recommend(db: DbSession, query: Annotated[AnswersQuery, Query()]) -> Recommendation:
    answers = rules.Answers(
        experience=query.experience,
        trout=query.trout,
        only_rod=query.only_rod,
        budget=query.budget,
    )
    return Recommendation(
        parts=[
            RecommendedPart(
                component=pick.component, part_id=_find(db, pick), reason=pick.reason
            )
            for pick in rules.recommend(answers)
        ]
    )
