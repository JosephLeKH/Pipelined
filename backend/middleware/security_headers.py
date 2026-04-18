"""Security headers middleware for defense-in-depth protections.

Sets X-Frame-Options, X-Content-Type-Options, and Strict-Transport-Security
headers on all responses to mitigate clickjacking, MIME-sniffing, and
protocol-downgrade attacks.
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from typing import Callable, Awaitable

from config import settings

# Security header values
FRAME_OPTIONS_DENY = "DENY"
CONTENT_TYPE_NOSNIFF = "nosniff"
HSTS_MAX_AGE_SECONDS = 31536000  # 1 year
HSTS_HEADER_VALUE = f"max-age={HSTS_MAX_AGE_SECONDS}; includeSubDomains"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        """Inject security headers into response."""
        response = await call_next(request)

        # Prevent clickjacking
        response.headers["X-Frame-Options"] = FRAME_OPTIONS_DENY

        # Prevent MIME-type sniffing
        response.headers["X-Content-Type-Options"] = CONTENT_TYPE_NOSNIFF

        # Enable HSTS only in production (not in debug mode)
        if not settings.debug:
            response.headers["Strict-Transport-Security"] = HSTS_HEADER_VALUE

        return response
