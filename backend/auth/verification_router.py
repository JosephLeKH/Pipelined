"""Email verification endpoints: verify and resend."""

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request

from auth.dependencies import get_current_user
from auth.email_verification import (
    EmailAlreadyVerifiedError,
    ResendRateLimitError,
    resend_verification,
    verify_email_token,
)
from auth.schemas import VerifyEmailRequest
from auth.service import TokenExpiredError, TokenInvalidError
from notifications.email_service import email_service
from middleware.rate_limit import limiter
from config import settings

logger = structlog.get_logger()

router = APIRouter(prefix="/api/auth", tags=["auth"])

RESEND_COOLDOWN_MESSAGE = "Verification email resent."


@router.post("/verify-email", status_code=200)
async def verify_email_endpoint(body: VerifyEmailRequest) -> dict:
    """Verify a user's email using the token sent during registration."""
    try:
        await verify_email_token(body.token)
    except TokenExpiredError:
        raise HTTPException(
            status_code=400,
            detail={"code": "TOKEN_EXPIRED", "message": "Verification token has expired."},
        )
    except TokenInvalidError:
        raise HTTPException(
            status_code=400,
            detail={"code": "TOKEN_INVALID", "message": "Invalid verification token."},
        )
    return {"data": {"message": "Email verified"}}


@router.post("/resend-verification", status_code=200)
@limiter.limit(settings.rate_limit_auth)
async def resend_verification_endpoint(
    request: Request,
    user: dict = Depends(get_current_user),
) -> dict:
    """Resend the email verification link. Rate limited to 3 per hour."""
    try:
        raw_token = await resend_verification(str(user["_id"]))
    except EmailAlreadyVerifiedError:
        raise HTTPException(
            status_code=400,
            detail={"code": "ALREADY_VERIFIED", "message": "Email is already verified."},
        )
    except ResendRateLimitError:
        raise HTTPException(
            status_code=429,
            detail={"code": "RATE_LIMITED", "message": "Too many resend requests. Try again in an hour."},
        )

    await email_service.send_verification_email(user["email"], raw_token)
    logger.info("verification_resent", user_id=str(user["_id"]))
    return {"data": {"message": RESEND_COOLDOWN_MESSAGE}}
