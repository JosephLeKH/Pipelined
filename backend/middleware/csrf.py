"""Double-submit cookie CSRF protection middleware.

On every GET /api/auth/me response the auth router sets a non-httpOnly
'pipelined_csrf' cookie.  For all mutating requests (POST, PATCH, DELETE)
the middleware verifies that X-CSRF-Token header matches that cookie.

Exempt paths (handled by auth or browser-initiated flows):
  /health
  /api/auth/login
  /api/auth/register
  /api/auth/google
  /api/auth/logout
  /api/auth/refresh
  /api/auth/forgot-password
  /api/auth/reset-password
"""

import secrets
from http.cookies import SimpleCookie

import structlog
from starlette.types import ASGIApp, Receive, Scope, Send

logger = structlog.get_logger()

CSRF_COOKIE_NAME = "pipelined_csrf"
CSRF_HEADER_NAME = "X-CSRF-Token"
CSRF_TOKEN_BYTES = 32

_MUTATION_METHODS = {b"POST", b"PATCH", b"DELETE"}

_EXEMPT_PATHS = {
    "/health",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/google",
    "/api/auth/logout",
    "/api/auth/refresh",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
}


def generate_csrf_token() -> str:
    """Return a cryptographically random 32-byte hex token."""
    return secrets.token_hex(CSRF_TOKEN_BYTES)


def _get_header(headers: list[tuple[bytes, bytes]], name: bytes) -> str | None:
    """Extract a single header value from raw ASGI headers."""
    for key, value in headers:
        if key.lower() == name:
            return value.decode("latin-1")
    return None


def _get_cookie(headers: list[tuple[bytes, bytes]], cookie_name: str) -> str | None:
    """Extract a cookie value from any ASGI Cookie header."""
    for key, value in headers:
        if key.lower() == b"cookie":
            sc = SimpleCookie(value.decode("latin-1"))
            if cookie_name in sc:
                return sc[cookie_name].value
    return None


def _raw_cookie_header(headers: list[tuple[bytes, bytes]]) -> str:
    """Return the raw Cookie header value (or empty string if not present) for diagnostics."""
    for key, value in headers:
        if key.lower() == b"cookie":
            return value.decode("latin-1", errors="replace")
    return ""


_CSRF_ERROR_BODY = b'{"error":{"code":"CSRF_TOKEN_MISMATCH","message":"CSRF token mismatch."}}'


class CSRFMiddleware:
    """Validate double-submit CSRF cookie on every mutating request."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "").encode() if isinstance(scope.get("method"), str) else scope.get("method", b"")
        path = scope.get("path", "")

        if method in _MUTATION_METHODS and path not in _EXEMPT_PATHS:
            headers = scope.get("headers", [])
            cookie_token = _get_cookie(headers, CSRF_COOKIE_NAME)
            header_token = _get_header(headers, b"x-csrf-token")

            if not cookie_token or not header_token or not secrets.compare_digest(cookie_token, header_token):
                raw_cookie = _raw_cookie_header(headers)
                cookie_names = sorted({c.split("=", 1)[0].strip() for c in raw_cookie.split(";") if "=" in c})
                logger.warning(
                    "csrf_check_failed",
                    path=path,
                    has_cookie=bool(cookie_token),
                    has_header=bool(header_token),
                    cookie_prefix=cookie_token[:8] if cookie_token else None,
                    header_prefix=header_token[:8] if header_token else None,
                    cookie_header_present=bool(raw_cookie),
                    cookie_header_length=len(raw_cookie),
                    cookie_names_received=cookie_names,
                    matched=bool(cookie_token and header_token and cookie_token == header_token),
                )
                await send({
                    "type": "http.response.start",
                    "status": 403,
                    "headers": [[b"content-type", b"application/json"]],
                })
                await send({
                    "type": "http.response.body",
                    "body": _CSRF_ERROR_BODY,
                })
                return

        await self.app(scope, receive, send)
