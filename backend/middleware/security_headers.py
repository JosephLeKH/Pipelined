"""Security headers middleware for defense-in-depth protections.

Sets X-Frame-Options, X-Content-Type-Options, and Strict-Transport-Security
headers on all responses to mitigate clickjacking, MIME-sniffing, and
protocol-downgrade attacks.
"""

from starlette.types import ASGIApp, Message, Receive, Scope, Send

from config import settings

# Security header values
FRAME_OPTIONS_DENY = "DENY"
CONTENT_TYPE_NOSNIFF = "nosniff"
HSTS_MAX_AGE_SECONDS = 31536000  # 1 year
HSTS_HEADER_VALUE = f"max-age={HSTS_MAX_AGE_SECONDS}; includeSubDomains"


class SecurityHeadersMiddleware:
    """Add security headers to all responses."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.append([b"x-frame-options", FRAME_OPTIONS_DENY.encode()])
                headers.append([b"x-content-type-options", CONTENT_TYPE_NOSNIFF.encode()])
                if not settings.debug:
                    headers.append([b"strict-transport-security", HSTS_HEADER_VALUE.encode()])
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, send_with_headers)
