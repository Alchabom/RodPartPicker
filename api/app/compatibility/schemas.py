from app.schemas import CamelModel


class CompatibleParts(CamelModel):
    """IDs of the parts that match, per component."""

    rod: list[int]
    reel: list[int]
    line: list[int]
    leader: list[int]
    tippet: list[int]
    recommended_line: list[int]


class BuildWarning(CamelModel):
    """Compatibility problem with a build."""

    code: str
    message: str


class BuildCheck(CamelModel):
    """Every warning for a build."""

    warnings: list[BuildWarning]
