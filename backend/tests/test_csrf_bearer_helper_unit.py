"""Unit tests for the CSRF middleware's bearer-token helper.

These run without the ASGI app fixture or MongoDB — they exercise the
private `_has_valid_bearer_token` directly with synthesized headers.
"""

import jwt

from auth.service import JWT_ALGORITHM, create_access_token
from config import settings
from middleware.csrf import _has_valid_bearer_token


def _headers(auth_value: str | None) -> list[tuple[bytes, bytes]]:
    """Build a raw ASGI headers list with an optional Authorization header."""
    if auth_value is None:
        return []
    return [(b"authorization", auth_value.encode("latin-1"))]


def test_accepts_valid_bearer_token() -> None:
    token = create_access_token("507f1f77bcf86cd799439011")
    assert _has_valid_bearer_token(_headers(f"Bearer {token}")) is True


def test_accepts_lowercase_bearer_scheme() -> None:
    """Header scheme matching must be case-insensitive (RFC 7235 §2.1)."""
    token = create_access_token("507f1f77bcf86cd799439011")
    assert _has_valid_bearer_token(_headers(f"bearer {token}")) is True


def test_rejects_missing_header() -> None:
    assert _has_valid_bearer_token(_headers(None)) is False


def test_rejects_wrong_scheme() -> None:
    token = create_access_token("507f1f77bcf86cd799439011")
    assert _has_valid_bearer_token(_headers(f"Basic {token}")) is False


def test_rejects_empty_token() -> None:
    assert _has_valid_bearer_token(_headers("Bearer ")) is False


def test_rejects_malformed_jwt() -> None:
    assert _has_valid_bearer_token(_headers("Bearer not-a-jwt")) is False


def test_rejects_tampered_signature() -> None:
    token = create_access_token("507f1f77bcf86cd799439011")
    # Flip the last char of the signature segment
    parts = token.rsplit(".", 1)
    tampered = parts[0] + "." + ("A" if parts[1][-1] != "A" else "B") + parts[1][:-1]
    assert _has_valid_bearer_token(_headers(f"Bearer {tampered}")) is False


def test_accepts_expired_token() -> None:
    """We intentionally do NOT verify expiry here — downstream get_current_user
    does. An old leaked token grants CSRF-bypass only, not actual access."""
    expired = jwt.encode(
        {"sub": "u", "exp": 0, "iat": 0, "type": "access"},
        settings.jwt_secret,
        algorithm=JWT_ALGORITHM,
    )
    assert _has_valid_bearer_token(_headers(f"Bearer {expired}")) is True


def test_rejects_wrong_signing_key() -> None:
    token = jwt.encode({"sub": "u"}, "different-secret", algorithm=JWT_ALGORITHM)
    assert _has_valid_bearer_token(_headers(f"Bearer {token}")) is False
