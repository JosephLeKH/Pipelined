"""Auth business logic: password hashing, JWT creation and decoding, user CRUD."""

import asyncio
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import httpx
import jwt
import structlog
from bson import ObjectId

from auth.schemas import TokenPayload
from config import settings
from database import get_collection

logger = structlog.get_logger()

BCRYPT_WORK_FACTOR = 12
ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"
JWT_ALGORITHM = "HS256"
DEFAULT_STAGES = ["Applied", "Phone Screen", "Onsite", "Offer", "Rejected"]
DEFAULT_TIMEZONE = "America/New_York"
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


def hash_password(plain: str) -> str:
    """Return a bcrypt hash of plain using work factor 12."""
    salt = bcrypt.gensalt(rounds=BCRYPT_WORK_FACTOR)
    return bcrypt.hashpw(plain.encode(), salt).decode()


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if plain matches the bcrypt hashed password."""
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(user_id: str) -> str:
    """Return a signed JWT access token for user_id with TTL from config."""
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_ttl_minutes)
    payload = {"sub": user_id, "exp": int(exp.timestamp()), "type": ACCESS_TOKEN_TYPE}
    return jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """Return a signed JWT refresh token for user_id with TTL from config."""
    exp = datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_ttl_days)
    payload = {"sub": user_id, "exp": int(exp.timestamp()), "type": REFRESH_TOKEN_TYPE}
    return jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> TokenPayload:
    """Decode and verify a JWT, returning its payload as a TokenPayload.

    Raises jwt.InvalidTokenError on bad signature, expiry, or malformed token.
    """
    data = jwt.decode(token, settings.jwt_secret, algorithms=[JWT_ALGORITHM])
    return TokenPayload(sub=data["sub"], exp=data["exp"], type=data["type"])


async def create_user(email: str, password: str, display_name: str) -> dict:
    """Insert a new user into the users collection and return the document.

    Raises DuplicateEmailError if a user with that email already exists.
    """
    users = get_collection("users")

    existing = await users.find_one({"email": email})
    if existing:
        raise DuplicateEmailError(email)

    password_hash = hash_password(password)
    doc: dict = {
        "email": email,
        "password_hash": password_hash,
        "display_name": display_name,
        "default_stages": DEFAULT_STAGES,
        "timezone": DEFAULT_TIMEZONE,
        "digest_enabled": True,
        "created_at": datetime.now(timezone.utc),
    }
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
    return await users.find_one({"_id": ObjectId(user_id)})


GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"


class GoogleTokenError(Exception):
    """Raised when Google ID token verification fails."""


async def google_verify_id_token(id_token: str) -> dict:
    """Verify a Google ID token and return its claims.

    Raises GoogleTokenError if the token is invalid or Google returns non-200.
    """
    async with httpx.AsyncClient() as http_client:
        response = await http_client.get(
            GOOGLE_TOKENINFO_URL, params={"id_token": id_token}
        )
    if response.status_code != 200:
        raise GoogleTokenError("Google token verification failed")
    return response.json()


async def get_or_create_google_user(
    google_id: str, email: str, display_name: str
) -> dict:
    """Return an existing user (looked up by google_id or email) or create one.

    If an existing user is found by email but lacks google_id, the field is linked.
    """
    users = get_collection("users")

    user, email_user = await asyncio.gather(
        users.find_one({"google_id": google_id}),
        users.find_one({"email": email}),
    )

    if user is not None:
        return user

    if email_user is not None:
        if not email_user.get("google_id"):
            await users.update_one(
                {"_id": email_user["_id"]}, {"$set": {"google_id": google_id}}
            )
            email_user["google_id"] = google_id
        return email_user

    doc: dict = {
        "email": email,
        "google_id": google_id,
        "display_name": display_name,
        "password_hash": None,
        "default_stages": DEFAULT_STAGES,
        "timezone": DEFAULT_TIMEZONE,
        "digest_enabled": True,
        "created_at": datetime.now(timezone.utc),
    }
    result = await users.insert_one(doc)
    doc["_id"] = result.inserted_id
    logger.info("google_user_created", user_id=str(result.inserted_id), email=email)
    return doc


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
) -> dict:
    """Update the user's default_stages, timezone, and/or digest_enabled; return the updated document."""
    users = get_collection("users")
    update_fields: dict = {}
    if stages is not None:
        update_fields["default_stages"] = stages
    if timezone is not None:
        update_fields["timezone"] = timezone
    if digest_enabled is not None:
        update_fields["digest_enabled"] = digest_enabled
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


async def clear_resume_text(user_id: str) -> None:
    """Remove stored resume text from the user document."""
    users = get_collection("users")
    await users.update_one(
        {"_id": ObjectId(user_id)},
        {"$unset": {"resume_text": ""}},
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
