"""Business logic for contacts: CRUD, application linking, and ping operations."""

from datetime import datetime, timezone

import structlog
from bson import ObjectId
from pymongo import ReturnDocument

from contacts.schemas import ContactCreate, ContactUpdate
from database import get_collection

logger = structlog.get_logger()

MAX_CONTACTS_LIST = 100
STALE_CONTACT_DAYS = 14


class ContactNotFoundError(Exception):
    """Raised when a contact does not exist for this user."""


class ApplicationNotFoundError(Exception):
    """Raised when the linked application does not exist for this user."""


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def create(user_id: ObjectId, body: ContactCreate) -> dict:
    """Insert a new contact and return the full document."""
    contacts = get_collection("contacts")
    now = _now()
    doc: dict = {
        "user_id": user_id,
        "name": body.name,
        "company": body.company,
        "role": body.role,
        "email": body.email,
        "linkedin_url": str(body.linkedin_url) if body.linkedin_url else None,
        "notes": body.notes,
        "relationship": body.relationship,
        "linked_applications": [],
        "last_contacted_at": body.last_contacted_at,
        "created_at": now,
        "updated_at": now,
    }
    result = await contacts.insert_one(doc)
    doc["_id"] = result.inserted_id
    logger.info("contact_created", user_id=str(user_id), contact_id=str(result.inserted_id))
    return doc


async def list_contacts(
    user_id: ObjectId,
    company: str | None = None,
    relationship: str | None = None,
    application_id: str | None = None,
    limit: int = 50,
) -> list[dict]:
    """Return contacts for a user with optional filters, sorted by last_contacted_at desc."""
    contacts = get_collection("contacts")
    filt: dict = {"user_id": user_id}
    if company:
        filt["company"] = {"$regex": company, "$options": "i"}
    if relationship:
        filt["relationship"] = relationship
    if application_id:
        filt["linked_applications"] = ObjectId(application_id)

    cursor = contacts.find(filt).sort([("last_contacted_at", -1), ("created_at", -1)]).limit(limit)
    return await cursor.to_list(length=limit)


async def get(user_id: ObjectId, contact_id: str) -> dict | None:
    """Fetch a single contact by ID, scoped to user."""
    contacts = get_collection("contacts")
    return await contacts.find_one({"_id": ObjectId(contact_id), "user_id": user_id})


async def update(user_id: ObjectId, contact_id: str, body: ContactUpdate) -> dict:
    """Apply partial update to a contact. Raises ContactNotFoundError if not found."""
    contacts = get_collection("contacts")
    raw = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None or k in body.model_fields_set}
    raw["updated_at"] = _now()

    if "linkedin_url" in raw and raw["linkedin_url"] is not None:
        raw["linkedin_url"] = str(raw["linkedin_url"])

    doc = await contacts.find_one_and_update(
        {"_id": ObjectId(contact_id), "user_id": user_id},
        {"$set": raw},
        return_document=ReturnDocument.AFTER,
    )
    if doc is None:
        raise ContactNotFoundError
    logger.info("contact_updated", user_id=str(user_id), contact_id=contact_id)
    return doc


async def delete(user_id: ObjectId, contact_id: str) -> None:
    """Delete a contact. Raises ContactNotFoundError if not found."""
    contacts = get_collection("contacts")
    result = await contacts.delete_one({"_id": ObjectId(contact_id), "user_id": user_id})
    if result.deleted_count == 0:
        raise ContactNotFoundError
    logger.info("contact_deleted", user_id=str(user_id), contact_id=contact_id)


async def link_application(user_id: ObjectId, contact_id: str, application_id: str) -> dict:
    """Add application to linked_applications (idempotent). Raises errors if not found."""
    apps = get_collection("applications")
    app_doc = await apps.find_one({"_id": ObjectId(application_id), "user_id": user_id}, projection={"_id": 1})
    if app_doc is None:
        raise ApplicationNotFoundError

    contacts = get_collection("contacts")
    doc = await contacts.find_one_and_update(
        {"_id": ObjectId(contact_id), "user_id": user_id},
        {
            "$addToSet": {"linked_applications": ObjectId(application_id)},
            "$set": {"updated_at": _now()},
        },
        return_document=ReturnDocument.AFTER,
    )
    if doc is None:
        raise ContactNotFoundError
    logger.info("contact_linked", user_id=str(user_id), contact_id=contact_id, app_id=application_id)
    return doc


async def unlink_application(user_id: ObjectId, contact_id: str, application_id: str) -> dict:
    """Remove application from linked_applications. Raises ContactNotFoundError if not found."""
    contacts = get_collection("contacts")
    doc = await contacts.find_one_and_update(
        {"_id": ObjectId(contact_id), "user_id": user_id},
        {
            "$pull": {"linked_applications": ObjectId(application_id)},
            "$set": {"updated_at": _now()},
        },
        return_document=ReturnDocument.AFTER,
    )
    if doc is None:
        raise ContactNotFoundError
    logger.info("contact_unlinked", user_id=str(user_id), contact_id=contact_id, app_id=application_id)
    return doc


async def ping(user_id: ObjectId, contact_id: str) -> dict:
    """Update last_contacted_at to now. Raises ContactNotFoundError if not found."""
    contacts = get_collection("contacts")
    now = _now()
    doc = await contacts.find_one_and_update(
        {"_id": ObjectId(contact_id), "user_id": user_id},
        {"$set": {"last_contacted_at": now, "updated_at": now}},
        return_document=ReturnDocument.AFTER,
    )
    if doc is None:
        raise ContactNotFoundError
    logger.info("contact_pinged", user_id=str(user_id), contact_id=contact_id)
    return doc
