"""Business logic for generating and serving public pipeline share links."""

import asyncio
import secrets
from datetime import datetime, timedelta, timezone

import structlog
from bson import ObjectId

from applications.service_analytics import compute_stats
from auth.service import get_user_by_id
from database import get_collection

logger = structlog.get_logger()

SLUG_BYTES = 8  # 16 hex chars
SHARE_TTL_DAYS = 30
PUBLIC_PROJECTION = {
    "role_title": 1,
    "company": 1,
    "current_stage": 1,
    "date_applied": 1,
    "stage_history": 1,
}


class ShareNotFoundError(Exception):
    """Raised when no active share exists for a slug."""


def _generate_slug() -> str:
    return secrets.token_hex(SLUG_BYTES)


async def create_share(user_id: str, share_type: str = "pipeline") -> dict:
    """Deactivate any existing share of the same type and create a new one. Returns the new share doc."""
    shares = get_collection("shares")
    uid = ObjectId(user_id)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=SHARE_TTL_DAYS)

    await shares.update_many(
        {"user_id": uid, "type": share_type, "is_active": True},
        {"$set": {"is_active": False}},
    )

    slug = _generate_slug()
    doc = {
        "user_id": uid,
        "slug": slug,
        "type": share_type,
        "created_at": now,
        "expires_at": expires_at,
        "is_active": True,
    }
    await shares.insert_one(doc)
    logger.info("share_created", user_id=user_id, slug=slug, share_type=share_type)
    return doc


async def get_my_share(user_id: str, share_type: str = "pipeline") -> dict | None:
    """Return the active, non-expired share for a user of the given type, or None."""
    shares = get_collection("shares")
    uid = ObjectId(user_id)
    now = datetime.now(timezone.utc)
    return await shares.find_one(
        {"user_id": uid, "type": share_type, "is_active": True, "expires_at": {"$gt": now}}
    )


async def revoke_share(user_id: str) -> None:
    """Deactivate all active shares for a user."""
    shares = get_collection("shares")
    uid = ObjectId(user_id)
    await shares.update_many(
        {"user_id": uid, "is_active": True},
        {"$set": {"is_active": False}},
    )
    logger.info("share_revoked", user_id=user_id)


async def get_public_pipeline(slug: str) -> dict:
    """Fetch public pipeline snapshot for a valid slug. Raises ShareNotFoundError if invalid."""
    shares = get_collection("shares")
    now = datetime.now(timezone.utc)

    share = await shares.find_one(
        {"slug": slug, "is_active": True, "expires_at": {"$gt": now}}
    )
    if share is None:
        raise ShareNotFoundError(slug)

    user_id = str(share["user_id"])
    user, stats, apps_cursor = await asyncio.gather(
        get_user_by_id(user_id),
        compute_stats(user_id),
        _fetch_public_applications(user_id),
    )

    display_name = user.get("display_name", "Anonymous") if user else "Anonymous"
    return {
        "display_name": display_name,
        "stats": stats,
        "applications": apps_cursor,
    }


async def _fetch_public_applications(user_id: str) -> list[dict]:
    """Return sanitised application list (no notes/compensation/tags)."""
    apps = get_collection("applications")
    uid = ObjectId(user_id)
    cursor = apps.find(
        {"user_id": uid, "deleted": {"$ne": True}, "archived": {"$ne": True}},
        PUBLIC_PROJECTION,
    ).sort("date_applied", -1)

    result = []
    async for doc in cursor:
        result.append({
            "id": str(doc["_id"]),
            "role_title": doc.get("role_title", ""),
            "company": doc.get("company", ""),
            "current_stage": doc.get("current_stage", ""),
            "date_applied": doc.get("date_applied", ""),
            "stage_history": doc.get("stage_history", []),
        })
    return result


async def get_public_timeline(slug: str) -> dict:
    """Fetch public timeline snapshot for a valid timeline slug. Raises ShareNotFoundError if invalid."""
    shares = get_collection("shares")
    now = datetime.now(timezone.utc)

    share = await shares.find_one(
        {"slug": slug, "type": "timeline", "is_active": True, "expires_at": {"$gt": now}}
    )
    if share is None:
        raise ShareNotFoundError(slug)

    user_id = str(share["user_id"])
    user, apps = await asyncio.gather(
        get_user_by_id(user_id),
        _fetch_timeline_applications(user_id),
    )

    display_name = user.get("display_name", "Anonymous") if user else "Anonymous"
    return {
        "display_name": display_name,
        "applications": apps,
    }


async def _fetch_timeline_applications(user_id: str) -> list[dict]:
    """Return timeline-only application list: company, role, stage, dates only."""
    apps = get_collection("applications")
    uid = ObjectId(user_id)
    
    timeline_projection = {
        "role_title": 1,
        "company": 1,
        "current_stage": 1,
        "date_applied": 1,
        "stage_history": 1,
    }
    
    cursor = apps.find(
        {"user_id": uid, "deleted": {"$ne": True}, "archived": {"$ne": True}},
        timeline_projection,
    ).sort("date_applied", -1)

    result = []
    async for doc in cursor:
        result.append({
            "id": str(doc["_id"]),
            "role_title": doc.get("role_title", ""),
            "company": doc.get("company", ""),
            "current_stage": doc.get("current_stage", ""),
            "date_applied": doc.get("date_applied", ""),
            "stage_history": doc.get("stage_history", []),
        })
    return result