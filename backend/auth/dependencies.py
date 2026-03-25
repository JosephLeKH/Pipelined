"""FastAPI dependency for extracting and validating the current authenticated user."""

import jwt
import structlog
from fastapi import Cookie, HTTPException

from auth import service as auth_service
from auth.service import ACCESS_TOKEN_TYPE, decode_token

logger = structlog.get_logger()


async def get_current_user(
    access_token: str | None = Cookie(default=None),
) -> dict:
    """Extract and validate JWT from access_token cookie, return user document."""
    if not access_token:
        raise HTTPException(
            status_code=401,
            detail={"code": "MISSING_TOKEN", "message": "Authentication required."},
        )

    try:
        payload = decode_token(access_token)
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail={"code": "INVALID_TOKEN", "message": "Invalid or expired token."},
        )

    if payload.type != ACCESS_TOKEN_TYPE:
        raise HTTPException(
            status_code=401,
            detail={"code": "WRONG_TOKEN_TYPE", "message": "Access token required."},
        )

    user = await auth_service.get_user_by_id(payload.sub)
    if user is None:
        raise HTTPException(
            status_code=401,
            detail={"code": "USER_NOT_FOUND", "message": "User no longer exists."},
        )

    return user
