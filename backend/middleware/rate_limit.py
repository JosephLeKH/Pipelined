"""Slowapi rate limiter singleton and per-tier limit constants.

Rate tiers (values from settings / environment):
  RATE_STANDARD  — 60/minute  — general API endpoints
  RATE_AI        — 10/minute  — OpenAI-backed endpoints
  RATE_AUTH      — 5/minute   — /register and /login
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from config import settings

RATE_STANDARD: str = settings.rate_limit_standard
RATE_AI: str = settings.rate_limit_ai
RATE_AUTH: str = settings.rate_limit_auth

limiter = Limiter(key_func=get_remote_address)
