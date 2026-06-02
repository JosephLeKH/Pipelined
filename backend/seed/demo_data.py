"""Orchestrator for new-user demo data: applications, calendar events, notifications.

Purpose: peer reviewers and demo recordings land on a populated dashboard
instead of an empty state. Idempotent via the DEMO_MARKER flag, so reruns
skip users who already have seeded apps.
"""

import structlog
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection

from auth.constants import DEFAULT_STAGES
from database import get_collection
from seed.applications import DEMO_MARKER, build_demo_applications
from seed.events import build_demo_events
from seed.notifications import build_demo_notifications

logger = structlog.get_logger()

# Cap the per-startup backfill scan so a huge users collection never blocks
# startup. Idempotent — subsequent restarts pick up where this left off.
BACKFILL_BATCH_SIZE = 1000


async def _already_seeded(apps: AsyncIOMotorCollection, uid: ObjectId) -> bool:
    existing = await apps.find_one(
        {"user_id": uid, DEMO_MARKER: True}, projection={"_id": 1}
    )
    return existing is not None


async def seed_demo_data_for_user(user_id: str, stages: list[str]) -> int:
    """Insert demo apps, calendar events, and notifications for the user.

    No-op if the user already has seeded apps. Returns the number of
    applications inserted (0 on skip or failure). Errors are logged and
    swallowed so a seed failure never blocks signup.
    """
    try:
        uid = ObjectId(user_id)
        apps = get_collection("applications")
        events = get_collection("calendar_events")
        notifications = get_collection("notifications")

        if await _already_seeded(apps, uid):
            logger.info("demo_seed_skipped", user_id=user_id, reason="already_seeded")
            return 0

        app_docs = build_demo_applications(uid, stages)
        result = await apps.insert_many(app_docs)
        apps_by_company = {
            doc["company"]: inserted_id
            for doc, inserted_id in zip(app_docs, result.inserted_ids)
        }

        event_docs = build_demo_events(uid, apps_by_company)
        if event_docs:
            await events.insert_many(event_docs)

        notification_docs = build_demo_notifications(uid)
        if notification_docs:
            await notifications.insert_many(notification_docs)

        logger.info(
            "demo_seed_complete",
            user_id=user_id,
            app_count=len(app_docs),
            event_count=len(event_docs),
            notification_count=len(notification_docs),
        )
        return len(app_docs)
    except Exception as exc:
        # Demo seed is never load-bearing — log and continue so signup succeeds.
        logger.warning("demo_seed_failed", user_id=user_id, error=str(exc))
        return 0


async def backfill_demo_for_all_users() -> dict[str, int]:
    """Seed every existing user that doesn't already have demo data.

    Idempotent. Safe to call on every startup. Returns a summary dict:
    {"scanned": N, "seeded": M, "skipped": N-M-errors, "errors": E}.
    """
    users = get_collection("users")
    summary = {"scanned": 0, "seeded": 0, "skipped": 0, "errors": 0}

    cursor = users.find(
        {}, projection={"_id": 1, "default_stages": 1}
    ).limit(BACKFILL_BATCH_SIZE)

    async for user in cursor:
        summary["scanned"] += 1
        stages = user.get("default_stages") or DEFAULT_STAGES
        try:
            inserted = await seed_demo_data_for_user(str(user["_id"]), stages)
            if inserted > 0:
                summary["seeded"] += 1
            else:
                summary["skipped"] += 1
        except Exception:
            summary["errors"] += 1
            logger.exception("backfill_user_failed", user_id=str(user["_id"]))

    logger.info("demo_backfill_complete", **summary)
    return summary
