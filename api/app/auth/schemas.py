"""Request and response bodies for /api/auth (Tasks 3.1-3.3).

SKELETON: fill in each TODO. Spec: "API" -> Routes. CamelModel (app/schemas.py)
already reads ORM objects and writes camelCase keys (display_name -> displayName).
"""

from typing import Annotated

from pydantic import BeforeValidator, EmailStr, StringConstraints

from app.schemas import CamelModel


def _normalize_email(value: object) -> object:
    """Strip and lowercase a string; return anything else unchanged.

    Runs BEFORE EmailStr validates, so " Me@X.COM " becomes "me@x.com" first.
    Leave non-strings alone: EmailStr will reject them with a proper 422,
    while calling .strip() on them here would crash with a 500.
    """
    if isinstance(value, str):
        return value.strip().lower()
    return value


NormalizedEmail = Annotated[EmailStr, BeforeValidator(_normalize_email)]


class CodeRequestIn(CamelModel):
    """Body of POST /code."""

    email: NormalizedEmail


class UserOut(CamelModel):
    """The signed-in user. Returned by /verify, /me and (later) /refresh."""

    id: int
    email: str
    display_name: str | None


class VerifyIn(CamelModel):
    """Body of POST /verify."""

    email: NormalizedEmail
    code: Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^\d{6}$")]
    # A str, never an int: "012345" as an int loses its leading zero.


class DisplayNameIn(CamelModel):
    """Body of PUT /me. The JSON key is displayName."""

    # TODO(3.3): display_name: stripped, matching ^[A-Za-z0-9_]{3,30}$
