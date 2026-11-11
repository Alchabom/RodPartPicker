from app.schemas import CamelModel


class NotCompatibleParts(CamelModel):
    """IDs of the parts that don't fit, per component. Empty until another part is picked."""

    rod: list[int]
    reel: list[int]
    line: list[int]  # leaves out heavier_line, which is offered separately
    leader: list[int]
    tippet: list[int]


class CompatibleParts(CamelModel):
    """IDs of the parts that match, per component."""

    rod: list[int]
    reel: list[int]
    line: list[int]
    leader: list[int]
    tippet: list[int]
    recommended_line: list[int]
    heavier_line: list[int]  # one weight up, for fast rods
    not_compatible: NotCompatibleParts


class BuildWarning(CamelModel):
    """Compatibility problem with a build."""

    code: str
    message: str


class BuildCheck(CamelModel):
    """Every warning for a build."""

    warnings: list[BuildWarning]
