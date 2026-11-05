from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from app.compatibility import rules
from app.compatibility.schemas import BuildCheck, BuildWarning, CompatibleParts
from app.db import DbSession
from app.parts.models import FlyLine, Leader, LineWeight, Reel, Rod, Tippet

router = APIRouter(prefix="/compatibility", tags=["compatibility"])


def _load(db, model, part_id):
    if part_id is None:
        return None
    part = db.get(model, part_id)
    if part is None:
        raise HTTPException(status_code=400, detail="Referenced part does not exist")
    return part


@router.get("/parts")
def get_compatible_parts(
    db: DbSession,
    rod_id: Annotated[int | None, Query(alias="rodId", gt=0)] = None,
    water: Literal["fresh", "salt"] | None = None,
) -> CompatibleParts:

    rod = _load(db, Rod, rod_id)
    effective = rules.effective_water(rod, water)

    lines = [
        line
        for line in db.scalars(select(FlyLine))
        if rules.line_matches(line, rod, effective, water)
    ]

    recommended = []
    if rod is not None:
        grains_max = dict(
            db.execute(select(LineWeight.weight_class, LineWeight.grains_max)).all()
        )
        recommended = [
            line.id
            for line in lines
            if rules.is_recommended(line, rod, grains_max[line.line_weight])
        ]

    return CompatibleParts(
        rod=[
            r.id
            for r in db.scalars(select(Rod))
            if rules.rod_matches(r, effective, water)
        ],
        reel=[
            reel.id
            for reel in db.scalars(select(Reel))
            if rules.reel_matches(reel, rod, effective, water)
        ],
        line=[line.id for line in lines],
        leader=[
            leader.id
            for leader in db.scalars(select(Leader))
            if rules.leader_matches(leader, rod, effective)
        ],
        tippet=[
            tippet.id
            for tippet in db.scalars(select(Tippet))
            if rules.passes_water(tippet.water, effective)
        ],
        recommended_line=recommended,
    )


@router.get("/check")
def check_compatibility(
    db: DbSession,
    rod_id: Annotated[int | None, Query(alias="rodId", gt=0)] = None,
    reel_id: Annotated[int | None, Query(alias="reelId", gt=0)] = None,
    fly_line_id: Annotated[int | None, Query(alias="flyLineId", gt=0)] = None,
    leader_id: Annotated[int | None, Query(alias="leaderId", gt=0)] = None,
    tippet_id: Annotated[int | None, Query(alias="tippetId", gt=0)] = None,
) -> BuildCheck:
    issues = rules.check_build(
        _load(db, Rod, rod_id),
        _load(db, Reel, reel_id),
        _load(db, FlyLine, fly_line_id),
        _load(db, Leader, leader_id),
        _load(db, Tippet, tippet_id),
    )
    return BuildCheck(
        warnings=[
            BuildWarning(code=issue.code, message=issue.message) for issue in issues
        ]
    )
