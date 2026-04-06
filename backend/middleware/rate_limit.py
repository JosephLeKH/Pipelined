"""Slowapi rate limiter singleton and per-tier limit constants.

Rate tiers (values from settings / environment):
  RATE_STANDARD  — 60/minute  — general API endpoints
  RATE_AI        — 10/minute  — OpenAI-backed endpoints
  RATE_AUTH      — 5/minute   — /register and /login

Key function reads real client IP from X-Forwarded-For when the connecting
address is in TRUSTED_PROXIES; falls back to X-Real-IP, then direct IP.
"""

from slowapi import Limiter
from starlette.requests import Request

from config import settings

RATE_STANDARD: str = settings.rate_limit_standard
RATE_AI: str = settings.rate_limit_ai
RATE_AUTH: str = settings.rate_limit_auth


def get_client_ip(request: Request) -> str:
    """Return the real client IP for rate-limit keying.

    If the connecting IP is in settings.trusted_proxies, read the
    leftmost value from X-Forwarded-For (the original client IP added by
    each successive proxy).  Falls back to X-Real-IP, then the raw TCP
    peer address.  When trusted_proxies is empty, always use the direct
    connection address to prevent spoofing in dev/CI.
    """
    connecting_ip: str = request.client.host if request.client else ""

    if connecting_ip in settings.trusted_proxies:
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()

    return connecting_ip


limiter = Limiter(key_func=get_client_ip)
