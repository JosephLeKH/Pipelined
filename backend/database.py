"""Motor async MongoDB client initialization and collection accessors."""

import asyncio

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from config import settings

MAX_POOL_SIZE = 50
SERVER_SELECTION_TIMEOUT_MS = 5000

client: AsyncIOMotorClient | None = None
db: AsyncIOMotorDatabase | None = None


async def connect() -> None:
    """Initialize Motor client and database reference."""
    global client, db
    client = AsyncIOMotorClient(
        settings.mongo_uri,
        maxPoolSize=MAX_POOL_SIZE,
        retryWrites=True,
        retryReads=True,
        serverSelectionTimeoutMS=SERVER_SELECTION_TIMEOUT_MS,
    )
    db = client[settings.mongo_db_name]


async def disconnect() -> None:
    """Close Motor client connection."""
    global client
    if client:
        client.close()
        client = None


def get_client() -> AsyncIOMotorClient:
    """Return the active Motor client (required for transactions)."""
    if client is None:
        raise RuntimeError("Database not connected. Call connect() first.")
    return client


def get_collection(name: str):
    """Return a collection reference from the active database."""
    if db is None:
        raise RuntimeError("Database not connected. Call connect() first.")
    return db[name]


async def ensure_indexes() -> None:
    """Create all required MongoDB indexes. Safe to call on every startup (idempotent)."""
    apps = get_collection("applications")
    events = get_collection("calendar_events")
    listings = get_collection("job_listings")
    users = get_collection("users")

    await asyncio.gather(
        apps.create_index([("user_id", 1), ("date_applied", -1)], name="user_date"),
        apps.create_index(
            [("user_id", 1), ("company", 1), ("role_title", 1)],
            name="duplicate_guard",
            unique=True,
        ),
        apps.create_index([("user_id", 1), ("updated_at", 1)], name="user_updated"),
        apps.create_index(
            [("role_title", "text"), ("company", "text"), ("notes", "text"), ("tags", "text")],
            name="application_text_search",
        ),
        events.create_index([("user_id", 1), ("date", 1)], name="user_date"),
        events.create_index([("application_id", 1)], name="app_id"),
        listings.create_index("url_hash", unique=True, name="url_dedup"),
        listings.create_index([("is_stale", 1), ("date_posted", -1)], name="stale_date"),
        listings.create_index(
            [("experience_level", 1), ("remote_status", 1)], name="filters"
        ),
        users.create_index("email", unique=True, name="email"),
        users.create_index("google_id", unique=True, sparse=True, name="google_id"),
    )
