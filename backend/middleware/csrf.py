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

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

CSRF_COOKIE_NAME = "pipelined_csrf"
CSRF_HEADER_NAME = "X-CSRF-Token"
CSRF_TOKEN_BYTES = 32

_MUTATION_METHODS = {"POST", "PATCH", "DELETE"}

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


class CSRFMiddleware(BaseHTTPMiddleware):
    """Validate double-submit CSRF cookie on every mutating request."""

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.method in _MUTATION_METHODS and request.url.path not in _EXEMPT_PATHS:
            cookie_token: str | None = request.cookies.get(CSRF_COOKIE_NAME)
            header_token: str | None = request.headers.get(CSRF_HEADER_NAME)

            if not cookie_token or not header_token:
                return _csrf_error_response()

            if not secrets.compare_digest(cookie_token, header_token):
                return _csrf_error_response()

        return await call_next(request)


def _csrf_error_response() -> JSONResponse:
    return JSONResponse(
        status_code=403,
        content={
            "error": {
                "code": "CSRF_TOKEN_MISMATCH",
                "message": "CSRF token mismatch.",
            }
        },
    )
