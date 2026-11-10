import hashlib
import hmac

from app.auth import codes
from app.auth.codes import codes_match, hash_code
from app.config import settings


def test_generate_code_is_six_digits(monkeypatch):
    asked = []
    monkeypatch.setattr(codes.secrets, "randbelow", lambda n: asked.append(n) or 42)
    assert codes.generate_code() == "000042"
    # The full range 000000-999999, not randbelow(999999)
    assert asked == [10**6]


def test_generate_code_real_output_is_six_digits():
    code = codes.generate_code()
    assert len(code) == 6
    assert code.isdigit()


def test_codes_match_accepts_right_code():
    assert codes_match(hash_code("a@x.com", "123456"), "a@x.com", "123456")


def test_codes_match_rejects_wrong_code():
    assert not codes_match(hash_code("a@x.com", "123456"), "a@x.com", "654321")


def test_codes_match_rejects_other_email():
    assert not codes_match(hash_code("a@x.com", "123456"), "b@x.com", "123456")


def test_hash_is_hmac_not_plain_sha256():
    # A plain hash of a 6-digit code could be reversed by trying all 10**6 values
    plain = hashlib.sha256(b"a@x.com:123456").hexdigest()
    assert hash_code("a@x.com", "123456") != plain


def test_hash_is_hmac_keyed_with_code_secret():
    # Pins the key, the "email:code" order and the hex encoding
    expected = hmac.new(
        settings.CODE_HMAC_SECRET.encode(), b"a@x.com:123456", hashlib.sha256
    ).hexdigest()
    assert hash_code("a@x.com", "123456") == expected


def test_hash_reads_secret_at_call_time(monkeypatch):
    before = hash_code("a@x.com", "123456")
    monkeypatch.setattr(settings, "CODE_HMAC_SECRET", "x" * 32)
    assert hash_code("a@x.com", "123456") != before
