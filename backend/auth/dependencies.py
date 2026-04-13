"""FastAPI dependency for extracting and validating the current authenticated user."""

import jwt
import structlog
from fastapi import Cookie, Depends, HTTPException

from auth import service as auth_service
from auth.service import ACCESS_TOKEN_TYPE, decode_token

logger = structlog.get_logger()

EMAIL_NOT_VERIFIED_DETAIL = {
    "code": "EMAIL_NOT_VERIFIED",
    "message": "Please verify your email address",
}


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


async def get_verified_user(user: dict = Depends(get_current_user)) -> dict:
    """Extend get_current_user by also requiring email_verified=True.

    Raises 403 EMAIL_NOT_VERIFIED if the user hasn't confirmed their email.
    """
    if not user.get("email_verified"):
        raise HTTPException(status_code=403, detail=EMAIL_NOT_VERIFIED_DETAIL)
    return user
