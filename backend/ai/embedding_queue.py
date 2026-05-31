"""Enqueue user embeddings for batch refresh via APScheduler."""

from datetime import datetime, timezone

import structlog
from bson import ObjectId

from database import get_collection

logger = structlog.get_logger()


async def enqueue_embedding_refresh(user_id: str) -> None:
    """Enqueue a user for embedding refresh. Idempotent (upserts on user_id).

    Args:
        user_id: User ObjectId as string
    """
    try:
        user_oid = ObjectId(user_id)
    except Exception as e:
        logger.warning("enqueue_embedding_refresh_invalid_user_id", user_id=user_id, error=str(e))
        return

    queue = get_collection("user_embeddings_queue")
    try:
        await queue.update_one(
            {"user_id": user_oid},
            {
                "$set": {
                    "user_id": user_oid,
                    "enqueued_at": datetime.now(timezone.utc),
                }
            },
            upsert=True,
        )
        logger.info("embedding_refresh_enqueued", user_id=user_id)
    except Exception as e:
        logger.warning("enqueue_embedding_refresh_failed", user_id=user_id, error=str(e))
