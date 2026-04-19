"""Email verification token logic: generate, verify, and resend."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import structlog
from bson import ObjectId

from auth.service import TokenExpiredError, TokenInvalidError
from database import get_collection

logger = structlog.get_logger()

VERIFICATION_TOKEN_BYTES = 32
VERIFICATION_TOKEN_TTL_HOURS = 24
VERIFICATION_RESEND_LIMIT = 3
VERIFICATION_RESEND_WINDOW_HOURS = 1


class EmailAlreadyVerifiedError(Exception):
    """Raised when resend is requested for an already-verified user."""


class ResendRateLimitError(Exception):
    """Raised when the resend rate limit (3 per hour) is exceeded."""


def _ensure_utc(dt: datetime) -> datetime:
    """Return dt with UTC timezone, attaching it if naive."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


async def create_verification_token(user_id: str) -> str:
    """Generate a verification token, store its hash, and return the raw token.

    Stores verification_token_hash and verification_token_expires_at on the user.
    """
    users = get_collection("users")
    raw_token = secrets.token_hex(VERIFICATION_TOKEN_BYTES)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=VERIFICATION_TOKEN_TTL_HOURS)

    await users.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "verification_token_hash": token_hash,
                "verification_token_expires_at": expires_at,
            }
        },
    )
    logger.info("verification_token_created", user_id=user_id)
    return raw_token


async def verify_email_token(token: str) -> None:
    """Validate the verification token and mark the user as verified.

    Raises TokenInvalidError if the token hash is not found.
    Raises TokenExpiredError if the token is past its expiry.
    Clears verification_token fields after success.
    """
    users = get_collection("users")
    token_hash = hashlib.sha256(token.encode()).hexdigest()

    user = await users.find_one({"verification_token_hash": token_hash})
    if user is None:
        raise TokenInvalidError("Verification token not found")

    expires_at = user.get("verification_token_expires_at")
    if expires_at is None or _ensure_utc(expires_at) < datetime.now(timezone.utc):
        raise TokenExpiredError("Verification token has expired")

    await users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"email_verified": True},
            "$unset": {
                "verification_token_hash": "",
                "verification_token_expires_at": "",
            },
        },
    )
    logger.info("email_verified", user_id=str(user["_id"]))


def _compute_resend_window(
    user: dict, now: datetime
) -> tuple[int, datetime | None]:
    """Return (resend_count, window_start) after resetting an expired window."""
    window_start: datetime | None = user.get("verification_resend_window_start")
    resend_count: int = user.get("verification_resend_count", 0)

    if window_start is not None:
        window_start = _ensure_utc(window_start)
        if now - window_start > timedelta(hours=VERIFICATION_RESEND_WINDOW_HOURS):
            resend_count = 0
            window_start = None

    return resend_count, window_start


async def resend_verification(user_id: str) -> str:
    """Generate a new verification token for user_id and return the raw token.

    Raises EmailAlreadyVerifiedError if the user is already verified.
    Raises ResendRateLimitError if the user has exceeded 3 resends per hour.
    """
    users = get_collection("users")
    user = await users.find_one({"_id": ObjectId(user_id)})

    if user is None:
        raise ValueError("User not found")

    if user.get("email_verified"):
        raise EmailAlreadyVerifiedError("Email is already verified")

    now = datetime.now(timezone.utc)
    resend_count, window_start = _compute_resend_window(user, now)

    if resend_count >= VERIFICATION_RESEND_LIMIT:
        raise ResendRateLimitError("Resend rate limit exceeded")

    new_count = resend_count + 1
    new_window_start = window_start if window_start is not None else now
    await users.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "verification_resend_count": new_count,
                "verification_resend_window_start": new_window_start,
            }
        },
    )
    logger.info("verification_resend", user_id=user_id, count=new_count)
    return await create_verification_token(user_id)
