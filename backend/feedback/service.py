"""Feedback business logic: storing user feedback submissions."""

from datetime import datetime, timezone

import structlog

from database import get_collection

logger = structlog.get_logger()


async def create_feedback(
    message: str,
    email: str | None,
    category: str,
    page: str,
    user_id: str | None,
) -> dict:
    """Insert a feedback document into the feedback collection and return it."""
    feedback = get_collection("feedback")
    doc: dict = {
        "message": message,
        "email": email,
        "category": category,
        "page": page,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc),
    }
    result = await feedback.insert_one(doc)
    doc["_id"] = result.inserted_id
    logger.info("feedback_created", feedback_id=str(result.inserted_id), category=category)
    return doc
