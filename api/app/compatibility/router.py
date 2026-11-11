from collections.abc import Callable
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select

from app.compatibility import rules
from app.compatibility.schemas import (
    BuildCheck,
    BuildWarning,
    CompatibleParts,
    NotCompatibleParts,
)
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


def _not_compatible(
    db, model, slot: str, selected: dict, fitting: list, offered: list | None = None
) -> list[int]:
    """Return the IDs of one component's parts that don't fit the build.

    Empty until another part is selected, since there's nothing to compare to.
    `offered` holds parts recommended elsewhere, which are left out.
    """
    if all(part is None for other, part in selected.items() if other != slot):
        return []
    keep = set(_ids(fitting)) | set(_ids(offered or []))
    return [part_id for part_id in db.scalars(select(model.id)) if part_id not in keep]


def _heavier_lines(db, selected: dict, water: str | None) -> list:
    """Return the one-weight-up lines that suit a fast rod and the rest of the build."""
    rod = selected["rod"]
    if rod is None:
        return []
    weight = db.get(LineWeight, rod.line_weight + 1)
    if weight is None:
        return []
    others = {slot: part for slot, part in selected.items() if slot != "rod"}
    candidates = db.scalars(
        select(FlyLine).where(FlyLine.line_weight == rod.line_weight + 1)
    )
    return [
        line
        for line in candidates
        if rules.is_heavier_recommendation(line, rod, weight)
        and rules.passes_filter(line.water, line.line_weight, water)
        and not rules.check_build(rod=rod, line=line, heavier_line=True)
        and not rules.conflicts("line", line, others)
    ]


def _is_heavier_line(db, rod, line) -> bool:
    if rod is None or line is None:
        return False
    weight = db.get(LineWeight, rod.line_weight + 1)
    return weight is not None and rules.is_heavier_recommendation(line, rod, weight)


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

    rods = _fitting(db, Rod, "rod", selected, water, lambda rod: rod.line_weight)
    reels = _fitting(
        db, Reel, "reel", selected, water, lambda reel: reel.max_line_weight
    )
    leaders = _fitting(db, Leader, "leader", selected, water)
    tippets = _fitting(db, Tippet, "tippet", selected, water)
    heavier = _heavier_lines(db, selected, water)

    # Rods start the build, so they're never not-compatible.
    # A light rod highlights every tippet, whatever else is selected. A heavy rod
    # drops light tippets from the highlights. Tippets are never not-compatible.
    if rod is not None and rules.highlights_every_tippet(rod):
        tippets = list(db.scalars(select(Tippet)))
    elif rod is not None:
        tippets = [
            tippet
            for tippet in tippets
            if not rules.is_light_tippet_for_rod(tippet, rod)
        ]

    return CompatibleParts(
        rod=_ids(rods),
        reel=_ids(reels),
        line=_ids(lines),
        leader=_ids(leaders),
        tippet=_ids(tippets),
        recommended_line=recommended,
        heavier_line=_ids(heavier),
        not_compatible=NotCompatibleParts(
            rod=[],
            reel=_not_compatible(db, Reel, "reel", selected, reels),
            line=_not_compatible(db, FlyLine, "line", selected, lines, heavier),
            leader=_not_compatible(db, Leader, "leader", selected, leaders),
            tippet=[],
        ),
    )


@router.get("/check")
def check_compatibility(db: DbSession, selected: SelectedParts) -> BuildCheck:
    heavier_line = _is_heavier_line(db, selected["rod"], selected["line"])
    return BuildCheck(
        warnings=[
            BuildWarning(code=issue.code, message=issue.message)
            for issue in rules.check_build(**selected, heavier_line=heavier_line)
        ]
    )
