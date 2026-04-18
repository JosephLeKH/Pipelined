"""Custom fields CRUD service."""

import structlog
from bson import ObjectId

from database import get_collection

logger = structlog.get_logger()

MAX_CUSTOM_FIELDS: int = 10


async def get_user_custom_fields(user_id: ObjectId) -> list[dict]:
    """Get all custom field definitions for a user."""
    col = get_collection("user_custom_fields")
    doc = await col.find_one({"user_id": user_id})
    if not doc:
        return []
    return doc.get("fields", [])


async def update_custom_fields(user_id: ObjectId, fields: list[dict]) -> list[dict]:
    """Update custom field definitions for a user. Max 10 fields."""
    if len(fields) > MAX_CUSTOM_FIELDS:
        raise ValueError(f"Maximum {MAX_CUSTOM_FIELDS} custom fields allowed")

    col = get_collection("user_custom_fields")
    result = await col.update_one(
        {"user_id": user_id},
        {"$set": {"user_id": user_id, "fields": fields}},
        upsert=True,
    )
    logger.info("custom_fields_updated", user_id=str(user_id), field_count=len(fields))
    return fields
