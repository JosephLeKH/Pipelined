"""Auth business logic: password hashing, JWT creation and decoding, user CRUD.

OAuth logic (Google, GitHub) lives in auth/oauth_service.py.
"""

import asyncio
import hashlib
import re
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
import structlog
from bson import ObjectId
from bson.errors import InvalidId

from auth.constants import (
    DEFAULT_AUTOPILOT_ENABLED,
    DEFAULT_AUTOPILOT_MAX_DAILY,
    DEFAULT_AUTOPILOT_MIN_MATCH_SCORE,
    DEFAULT_MORNING_BRIEF_EMAIL,
    DEFAULT_MORNING_BRIEF_ENABLED,
    DEFAULT_MORNING_BRIEF_HOUR,
    DEFAULT_MORNING_BRIEF_IN_APP,
    DEFAULT_STAGES,
    DEFAULT_TIMEZONE,
    DEFAULT_WEEKLY_DIGEST_ENABLED,
    DEFAULT_WEEKLY_REVIEW_ENABLED,
    DEFAULT_GMAIL_INTERVIEW_PREP,
)
from auth.schemas import TokenPayload
from config import settings
from database import get_collection
from motor.motor_asyncio import AsyncIOMotorCollection

# Re-exported for router backward compatibility.
from auth.oauth_service import (  # noqa: F401
    GithubCodeError,
    GoogleTokenError,
    get_or_create_google_user,
    google_verify_id_token,
    github_auth,
)

logger = structlog.get_logger()

BCRYPT_WORK_FACTOR = 12
ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"
JWT_ALGORITHM = "HS256"
RESET_TOKEN_BYTES = 32
RESET_TOKEN_TTL_HOURS = 1


class DuplicateEmailError(Exception):
    """Raised when creating a user with an email that already exists."""

    def __init__(self, email: str) -> None:
        self.email = email


class TokenExpiredError(Exception):
    """Raised when a password reset token is past its expiry."""


class TokenInvalidError(Exception):
    """Raised when a password reset token hash is not found."""


class CurrentPasswordIncorrectError(Exception):
    """Raised when the supplied current password does not match the stored hash."""


class PasswordWeakError(Exception):
    """Raised when the new password fails strength requirements."""


def hash_password(plain: str) -> str:
    """Return a bcrypt hash of plain using work factor 12."""
    salt = bcrypt.gensalt(rounds=BCRYPT_WORK_FACTOR)
    return bcrypt.hashpw(plain.encode(), salt).decode()


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if plain matches the bcrypt hashed password."""
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(user_id: str) -> str:
    """Return a signed JWT access token for user_id with TTL from config."""
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=settings.jwt_access_ttl_minutes)
    payload = {"sub": user_id, "exp": int(exp.timestamp()), "iat": int(now.timestamp()), "type": ACCESS_TOKEN_TYPE}
    return jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """Return a signed JWT refresh token for user_id with TTL from config."""
    now = datetime.now(timezone.utc)
    exp = now + timedelta(days=settings.jwt_refresh_ttl_days)
    payload = {"sub": user_id, "exp": int(exp.timestamp()), "iat": int(now.timestamp()), "type": REFRESH_TOKEN_TYPE}
    return jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> TokenPayload:
    """Decode and verify a JWT, returning its payload as a TokenPayload.

    Raises jwt.InvalidTokenError on bad signature, expiry, or malformed token.
    """
    data = jwt.decode(token, settings.jwt_secret, algorithms=[JWT_ALGORITHM])
    return TokenPayload(sub=data["sub"], exp=data["exp"], type=data["type"], iat=data.get("iat"))


REFERRAL_CODE_BYTES = 6  # secrets.token_urlsafe(6) → 8 base64 chars


def _build_user_doc(email: str, password: str, display_name: str) -> dict:
    """Return the base user document (no referral fields yet)."""
    password_hash = hash_password(plain=password)
    new_code = secrets.token_urlsafe(REFERRAL_CODE_BYTES)
    return {
        "email": email,
        "password_hash": password_hash,
        "display_name": display_name,
        "default_stages": DEFAULT_STAGES,
        "timezone": DEFAULT_TIMEZONE,
        "digest_enabled": DEFAULT_WEEKLY_DIGEST_ENABLED,
        "weekly_digest_enabled": DEFAULT_WEEKLY_DIGEST_ENABLED,
        "weekly_review_enabled": DEFAULT_WEEKLY_REVIEW_ENABLED,
        "morning_brief_enabled": DEFAULT_MORNING_BRIEF_ENABLED,
        "morning_brief_hour": DEFAULT_MORNING_BRIEF_HOUR,
        "morning_brief_email": DEFAULT_MORNING_BRIEF_EMAIL,
        "morning_brief_in_app": DEFAULT_MORNING_BRIEF_IN_APP,
        "email_verified": False,
        "created_at": datetime.now(timezone.utc),
        "referral_code": new_code,
        "referral_count": 0,
        "referred_by": None,
        "autopilot_enabled": DEFAULT_AUTOPILOT_ENABLED,
        "autopilot_min_match_score": DEFAULT_AUTOPILOT_MIN_MATCH_SCORE,
        "autopilot_max_daily": DEFAULT_AUTOPILOT_MAX_DAILY,
        "gmail_interview_prep": DEFAULT_GMAIL_INTERVIEW_PREP,
    }


async def _apply_referral(users: AsyncIOMotorCollection, doc: dict, referral_code: str) -> None:
    """Apply referral_code to doc and increment the referrer's count if valid."""
    referrer = await users.find_one({"referral_code": referral_code})
    if referrer is not None:
        doc["referred_by"] = referral_code
        # TODO: trigger perks at referral_count thresholds (e.g., 3 referrals = 1 month Pro trial)
        await users.update_one(
            {"referral_code": referral_code},
            {"$inc": {"referral_count": 1}},
        )
        logger.info("referral_applied", referrer_id=str(referrer["_id"]))


async def create_user(
    email: str,
    password: str,
    display_name: str,
    referral_code: str | None = None,
) -> dict:
    """Insert a new user into the users collection and return the document.

    Raises DuplicateEmailError if a user with that email already exists.
    If referral_code is provided and matches an existing user, set referred_by
    and atomically increment that user's referral_count.
    """
    users = get_collection("users")

    existing = await users.find_one({"email": email})
    if existing:
        raise DuplicateEmailError(email)

    doc = _build_user_doc(email, password, display_name)

    if referral_code:
        await _apply_referral(users, doc, referral_code)

    result = await users.insert_one(doc)
    doc["_id"] = result.inserted_id

    logger.info("user_created", user_id=str(result.inserted_id), email=email)
    return doc


async def get_user_by_email(email: str) -> dict | None:
    """Return the user document matching email, or None if not found."""
    users = get_collection("users")
    return await users.find_one({"email": email})


async def get_user_by_id(user_id: str) -> dict | None:
    """Return the user document matching user_id, or None if not found."""
    users = get_collection("users")
    try:
        return await users.find_one({"_id": ObjectId(user_id)})
    except InvalidId:
        return None


def _ensure_utc(dt: datetime) -> datetime:
    """Return dt with UTC timezone, attaching it if naive."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


async def create_password_reset_token(email: str) -> tuple[str, dict | None]:
    """Generate a reset token for an email-auth user and return (raw_token, user_doc).

    Stores reset_token_hash and reset_token_expires_at in the users collection.
    Returns (raw_token, None) if no email-auth user with that address exists —
    callers must not reveal this to prevent email enumeration.
    """
    users = get_collection("users")
    user = await users.find_one({"email": email, "password_hash": {"$ne": None}})

    raw_token = secrets.token_hex(RESET_TOKEN_BYTES)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=RESET_TOKEN_TTL_HOURS)

    if user is not None:
        await users.update_one(
            {"_id": user["_id"]},
            {"$set": {"reset_token_hash": token_hash, "reset_token_expires_at": expires_at}},
        )
        logger.info("password_reset_token_created", user_id=str(user["_id"]))

    return raw_token, user


async def update_user_profile(
    user_id: str,
    stages: list[str] | None,
    timezone: str | None,
    digest_enabled: bool | None,
    weekly_goal: int | None = None,
    *,
    morning_brief_enabled: bool | None = None,
    morning_brief_hour: int | None = None,
    morning_brief_email: bool | None = None,
    morning_brief_in_app: bool | None = None,
    weekly_digest_enabled: bool | None = None,
    weekly_review_enabled: bool | None = None,
    autopilot_enabled: bool | None = None,
    autopilot_min_match_score: int | None = None,
    autopilot_max_daily: int | None = None,
    agent_profile: dict | None = None,
    watchlist_companies: list[dict] | None = None,
) -> dict:
    """Update user profile fields and return the updated document."""
    users = get_collection("users")
    update_fields: dict = {}
    if stages is not None:
        update_fields["default_stages"] = stages
    if timezone is not None:
        update_fields["timezone"] = timezone
    resolved_weekly_digest = weekly_digest_enabled if weekly_digest_enabled is not None else digest_enabled
    if resolved_weekly_digest is not None:
        update_fields["weekly_digest_enabled"] = resolved_weekly_digest
        update_fields["digest_enabled"] = resolved_weekly_digest
    if weekly_goal is not None:
        update_fields["weekly_goal"] = weekly_goal
    if weekly_review_enabled is not None:
        update_fields["weekly_review_enabled"] = weekly_review_enabled
    if morning_brief_enabled is not None:
        update_fields["morning_brief_enabled"] = morning_brief_enabled
    if morning_brief_hour is not None:
        update_fields["morning_brief_hour"] = morning_brief_hour
    if morning_brief_email is not None:
        update_fields["morning_brief_email"] = morning_brief_email
    if morning_brief_in_app is not None:
        update_fields["morning_brief_in_app"] = morning_brief_in_app
    if autopilot_enabled is not None:
        update_fields["autopilot_enabled"] = autopilot_enabled
    if autopilot_min_match_score is not None:
        update_fields["autopilot_min_match_score"] = autopilot_min_match_score
    if autopilot_max_daily is not None:
        update_fields["autopilot_max_daily"] = autopilot_max_daily
    if agent_profile is not None:
        update_fields["agent_profile"] = agent_profile
    if watchlist_companies is not None:
        update_fields["watchlist_companies"] = watchlist_companies
    if update_fields:
        await users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_fields},
        )
    user = await users.find_one({"_id": ObjectId(user_id)})
    logger.info("user_profile_updated", user_id=user_id, fields=list(update_fields))
    return user


async def save_resume_text(user_id: str, resume_text: str) -> None:
    """Store extracted resume text on the user document."""
    users = get_collection("users")
    await users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"resume_text": resume_text}},
    )
    logger.info("resume_saved", user_id=user_id, chars=len(resume_text))


async def save_resume_pdf_key(user_id: str, key: str) -> None:
    """Store the Spaces object key for the user's uploaded PDF."""
    users = get_collection("users")
    await users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"resume_pdf_key": key}},
    )


async def get_resume_pdf_key(user_id: str) -> str | None:
    """Return the Spaces key for the user's PDF, or None if not set."""
    users = get_collection("users")
    user = await users.find_one({"_id": ObjectId(user_id)}, {"resume_pdf_key": 1})
    if user is None:
        return None
    return user.get("resume_pdf_key")


async def clear_resume_text(user_id: str) -> None:
    """Remove stored resume text and PDF key from the user document."""
    users = get_collection("users")
    await users.update_one(
        {"_id": ObjectId(user_id)},
        {"$unset": {"resume_text": "", "resume_pdf_key": ""}},
    )
    logger.info("resume_cleared", user_id=user_id)


async def reset_password(token: str, new_password: str) -> None:
    """Validate the reset token and update the user's password.

    Raises TokenInvalidError if the token hash is not found.
    Raises TokenExpiredError if the token is past its expiry.
    Clears reset_token fields after a successful reset.
    """
    users = get_collection("users")
    token_hash = hashlib.sha256(token.encode()).hexdigest()

    user = await users.find_one({"reset_token_hash": token_hash})
    if user is None:
        raise TokenInvalidError("Token not found")

    expires_at = user.get("reset_token_expires_at")
    if expires_at is None or _ensure_utc(expires_at) < datetime.now(timezone.utc):
        raise TokenExpiredError("Token has expired")

    new_hash = hash_password(new_password)
    await users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"password_hash": new_hash},
            "$unset": {"reset_token_hash": "", "reset_token_expires_at": ""},
        },
    )
    logger.info("password_reset_completed", user_id=str(user["_id"]))


PASSWORD_MIN_LENGTH = 8
PASSWORD_UPPERCASE_RE = re.compile(r"[A-Z]")
PASSWORD_DIGIT_RE = re.compile(r"[0-9]")


async def change_password(user_id: str, current_password: str, new_password: str) -> None:
    """Change a user's password after verifying the current one.

    Raises CurrentPasswordIncorrectError if current_password is wrong.
    Raises PasswordWeakError if new_password fails strength requirements.
    Invalidates existing refresh tokens by updating tokens_invalidated_at.
    """
    users = get_collection("users")
    user = await users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise CurrentPasswordIncorrectError

    if not verify_password(current_password, user["password_hash"]):
        raise CurrentPasswordIncorrectError

    if (
        len(new_password) < PASSWORD_MIN_LENGTH
        or not PASSWORD_UPPERCASE_RE.search(new_password)
        or not PASSWORD_DIGIT_RE.search(new_password)
    ):
        raise PasswordWeakError

    new_hash = hash_password(new_password)
    await users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"password_hash": new_hash, "tokens_invalidated_at": datetime.now(timezone.utc)}},
    )
    logger.info("password_changed", user_id=user_id)


async def delete_user(user_id: str) -> None:
    """Delete the user and all their data across all collections in parallel."""
    oid = ObjectId(user_id)
    await asyncio.gather(
        get_collection("applications").delete_many({"user_id": user_id}),
        get_collection("calendar_events").delete_many({"user_id": user_id}),
        get_collection("contacts").delete_many({"user_id": user_id}),
        get_collection("saved_searches").delete_many({"user_id": oid}),
        get_collection("notifications").delete_many({"user_id": oid}),
        get_collection("user_custom_fields").delete_many({"user_id": oid}),
        get_collection("shares").delete_many({"user_id": oid}),
        get_collection("application_templates").delete_many({"user_id": oid}),
        get_collection("pending_opportunities").delete_many({"user_id": oid}),
        get_collection("users").delete_one({"_id": oid}),
    )
    logger.info("user_deleted", user_id=user_id)
