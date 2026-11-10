from collections.abc import Callable
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
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


def _selected_parts(
    db: DbSession,
    rod_id: Annotated[int | None, Query(alias="rodId", gt=0)] = None,
    reel_id: Annotated[int | None, Query(alias="reelId", gt=0)] = None,
    fly_line_id: Annotated[int | None, Query(alias="flyLineId", gt=0)] = None,
    leader_id: Annotated[int | None, Query(alias="leaderId", gt=0)] = None,
    tippet_id: Annotated[int | None, Query(alias="tippetId", gt=0)] = None,
) -> dict:
    """Load the build's parts, keyed by rules.check_build argument name."""
    return {
        "rod": _load(db, Rod, rod_id),
        "reel": _load(db, Reel, reel_id),
        "line": _load(db, FlyLine, fly_line_id),
        "leader": _load(db, Leader, leader_id),
        "tippet": _load(db, Tippet, tippet_id),
    }


SelectedParts = Annotated[dict, Depends(_selected_parts)]


def _no_weight(_part) -> None:
    return None


def _fitting(
    db,
    model,
    slot: str,
    selected: dict,
    water: str | None,
    top_weight: Callable = _no_weight,
) -> list:
    """Return the parts of one component that fit the rest of the build."""
    return [
        part
        for part in db.scalars(select(model))
        if rules.passes_filter(part.water, top_weight(part), water)
        and not rules.conflicts(slot, part, selected)
    ]


def _ids(parts: list) -> list[int]:
    return [part.id for part in parts]


@router.get("/parts")
def get_compatible_parts(
    db: DbSession,
    selected: SelectedParts,
    water: Literal["fresh", "salt"] | None = None,
) -> CompatibleParts:
    lines = _fitting(
        db, FlyLine, "line", selected, water, lambda line: line.line_weight
    )

    recommended = []
    rod = selected["rod"]
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
        rod=_ids(
            _fitting(db, Rod, "rod", selected, water, lambda rod: rod.line_weight)
        ),
        reel=_ids(
            _fitting(
                db, Reel, "reel", selected, water, lambda reel: reel.max_line_weight
            )
        ),
        line=_ids(lines),
        leader=_ids(_fitting(db, Leader, "leader", selected, water)),
        tippet=_ids(_fitting(db, Tippet, "tippet", selected, water)),
        recommended_line=recommended,
    )


@router.get("/check")
def check_compatibility(selected: SelectedParts) -> BuildCheck:
    return BuildCheck(
        warnings=[
            BuildWarning(code=issue.code, message=issue.message)
            for issue in rules.check_build(**selected)
        ]
    )
