"""Cache-Control header middleware for API and static responses."""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from typing import Callable, Awaitable

# Cache-Control values
PRIVATE_NO_CACHE = "private, no-cache"
PUBLIC_5_MIN = "public, max-age=300"
PUBLIC_1_DAY = "public, max-age=86400"

_LONG_LIVED_PATHS = frozenset(["/sitemap.xml", "/robots.txt"])


class CacheControlMiddleware(BaseHTTPMiddleware):
    """Set Cache-Control headers based on the response path."""

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        """Inject Cache-Control headers into response."""
        response = await call_next(request)
        path = request.url.path

        if path in _LONG_LIVED_PATHS:
            response.headers["Cache-Control"] = PUBLIC_1_DAY
        elif path.startswith("/api/public/"):
            response.headers["Cache-Control"] = PUBLIC_5_MIN
        elif path.startswith("/api/"):
            response.headers["Cache-Control"] = PRIVATE_NO_CACHE

        return response
