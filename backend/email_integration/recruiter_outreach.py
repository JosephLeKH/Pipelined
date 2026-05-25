"""Recruiter lead creation and management for the pending inbox."""

from datetime import datetime, timezone

import structlog
from bson import ObjectId
from bson.errors import InvalidId

from database import get_collection

logger = structlog.get_logger()

RECRUITER_LEADS_COLLECTION = "recruiter_leads"
STATUS_PENDING = "pending"
STATUS_ADDED_TO_WATCHLIST = "added_to_watchlist"
STATUS_DISMISSED = "dismissed"
SUBJECT_MAX_CHARS = 200


async def create_recruiter_lead(
    user_id: str,
    company: str,
    role_title: str | None,
    subject: str,
) -> dict | None:
    """Insert a pending recruiter lead. Returns None if one already exists for this company."""
    try:
        uid = ObjectId(user_id)
    except InvalidId:
        return None

    col = get_collection(RECRUITER_LEADS_COLLECTION)
    existing = await col.find_one({"user_id": uid, "company": company, "status": STATUS_PENDING})
    if existing:
        return None

    doc: dict = {
        "user_id": uid,
        "company": company,
        "role_title": role_title or None,
        "status": STATUS_PENDING,
        "subject": subject[:SUBJECT_MAX_CHARS],
        "created_at": datetime.now(timezone.utc),
        "reviewed_at": None,
    }
    result = await col.insert_one(doc)
    doc["_id"] = result.inserted_id
    logger.info("recruiter_lead_created", user_id=user_id, company=company)
    return doc


async def list_recruiter_leads(user_id: str) -> list[dict]:
    """Return pending recruiter leads for a user, newest first."""
    try:
        uid = ObjectId(user_id)
    except InvalidId:
        return []

    cursor = (
        get_collection(RECRUITER_LEADS_COLLECTION)
        .find({"user_id": uid, "status": STATUS_PENDING})
        .sort("created_at", -1)
    )
    return await cursor.to_list(length=100)


async def get_recruiter_lead(user_id: str, lead_id: str) -> dict | None:
    """Fetch a single recruiter lead scoped to user_id."""
    try:
        uid = ObjectId(user_id)
        oid = ObjectId(lead_id)
    except InvalidId:
        return None

    return await get_collection(RECRUITER_LEADS_COLLECTION).find_one(
        {"_id": oid, "user_id": uid}
    )


async def set_lead_status(user_id: str, lead_id: str, new_status: str) -> bool:
    """Update a pending lead's status. Returns True if modified."""
    try:
        uid = ObjectId(user_id)
        oid = ObjectId(lead_id)
    except InvalidId:
        return False

    result = await get_collection(RECRUITER_LEADS_COLLECTION).update_one(
        {"_id": oid, "user_id": uid, "status": STATUS_PENDING},
        {"$set": {"status": new_status, "reviewed_at": datetime.now(timezone.utc)}},
    )
    return result.modified_count > 0
