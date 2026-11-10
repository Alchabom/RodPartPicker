"""One-time login codes: generating, hashing and checking them."""

import hashlib
import hmac
import secrets
from datetime import timedelta

from app.config import settings

CODE_TTL = timedelta(minutes=10)
MAX_ATTEMPTS = 5


def generate_code() -> str:
    """A random 6-digit code, zero-padded ("000042", never "42")."""
    # secrets, not random: random's output is predictable
    return f"{secrets.randbelow(10**6):06d}"


def hash_code(email: str, code: str) -> str:
    """Hex HMAC-SHA256 of "email:code", keyed with CODE_HMAC_SECRET.

    Keyed so a leaked table can't be reversed by hashing all 10**6 codes.
    """
    key = settings.CODE_HMAC_SECRET.encode()
    message = f"{email}:{code}".encode()
    return hmac.new(key, message, hashlib.sha256).hexdigest()


def codes_match(code_hash: str, email: str, code: str) -> bool:
    """True if `code` for `email` hashes to the stored `code_hash`."""
    # compare_digest takes the same time however much matches; == would leak it
    return hmac.compare_digest(code_hash, hash_code(email, code))
