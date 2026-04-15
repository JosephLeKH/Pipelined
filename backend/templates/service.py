"""Business logic for application templates: create, list, update, delete."""

from datetime import datetime, timezone

import structlog
from bson import ObjectId
from pymongo import ReturnDocument

from database import get_collection
from templates.schemas import MAX_TEMPLATES_PER_USER, TemplateCreate, TemplateUpdate

logger = structlog.get_logger()


class TemplateLimitError(Exception):
    """Raised when a user has reached the maximum template count."""


class TemplateNotFoundError(Exception):
    """Raised when a template does not exist for this user."""


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def create(user_id: ObjectId, body: TemplateCreate) -> dict:
    """Insert a new template. Raises TemplateLimitError if limit exceeded."""
    templates = get_collection("application_templates")
    count = await templates.count_documents({"user_id": user_id})
    if count >= MAX_TEMPLATES_PER_USER:
        raise TemplateLimitError

    now = _now()
    doc: dict = {
        "user_id": user_id,
        "name": body.name,
        "fields": body.fields.model_dump(),
        "created_at": now,
    }
    result = await templates.insert_one(doc)
    doc["_id"] = result.inserted_id
    logger.info("template_created", user_id=str(user_id), template_id=str(result.inserted_id))
    return doc


async def list_templates(user_id: ObjectId) -> list[dict]:
    """Return all templates for a user, sorted by created_at descending."""
    templates = get_collection("application_templates")
    cursor = templates.find({"user_id": user_id}).sort("created_at", -1)
    return await cursor.to_list(length=MAX_TEMPLATES_PER_USER)


async def update(user_id: ObjectId, template_id: str, body: TemplateUpdate) -> dict:
    """Partially update a template. Raises TemplateNotFoundError if not found."""
    templates = get_collection("application_templates")
    patch: dict = {}
    if body.name is not None:
        patch["name"] = body.name
    if body.fields is not None:
        patch["fields"] = body.fields.model_dump()
    if not patch:
        doc = await templates.find_one({"_id": ObjectId(template_id), "user_id": user_id})
        if doc is None:
            raise TemplateNotFoundError
        return doc

    doc = await templates.find_one_and_update(
        {"_id": ObjectId(template_id), "user_id": user_id},
        {"$set": patch},
        return_document=ReturnDocument.AFTER,
    )
    if doc is None:
        raise TemplateNotFoundError
    logger.info("template_updated", user_id=str(user_id), template_id=template_id)
    return doc


async def delete(user_id: ObjectId, template_id: str) -> None:
    """Delete a template. Raises TemplateNotFoundError if not found."""
    templates = get_collection("application_templates")
    result = await templates.delete_one({"_id": ObjectId(template_id), "user_id": user_id})
    if result.deleted_count == 0:
        raise TemplateNotFoundError
    logger.info("template_deleted", user_id=str(user_id), template_id=template_id)
