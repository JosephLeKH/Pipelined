"""Auth business logic: password hashing, JWT creation and decoding, user CRUD."""

from datetime import datetime, timedelta, timezone

import bcrypt
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


class DuplicateEmailError(Exception):
    """Raised when creating a user with an email that already exists."""

    def __init__(self, email: str) -> None:
        self.email = email


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
