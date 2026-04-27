"""Cache-Control header middleware for API and static responses."""

from starlette.types import ASGIApp, Message, Receive, Scope, Send

# Cache-Control values
PRIVATE_NO_CACHE = "private, no-cache"
PUBLIC_5_MIN = "public, max-age=300"
PUBLIC_1_DAY = "public, max-age=86400"

_LONG_LIVED_PATHS = frozenset(["/sitemap.xml", "/robots.txt"])


class CacheControlMiddleware:
    """Set Cache-Control headers based on the response path."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")

        if path in _LONG_LIVED_PATHS:
            cache_value = PUBLIC_1_DAY
        elif path.startswith("/api/public/"):
            cache_value = PUBLIC_5_MIN
        elif path.startswith("/api/"):
            cache_value = PRIVATE_NO_CACHE
        else:
            cache_value = None

        if cache_value is None:
            await self.app(scope, receive, send)
            return

        async def send_with_cache(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.append([b"cache-control", cache_value.encode()])
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, send_with_cache)
