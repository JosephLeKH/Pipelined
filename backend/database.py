"""Motor async MongoDB client initialization and collection accessors."""

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


def get_collection(name: str):
    """Return a collection reference from the active database."""
    if db is None:
        raise RuntimeError("Database not connected. Call connect() first.")
    return db[name]
