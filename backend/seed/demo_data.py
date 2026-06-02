"""Orchestrator for new-user demo data: applications, calendar events, notifications.

Purpose: peer reviewers and demo recordings land on a populated dashboard
instead of an empty state. Idempotent via the DEMO_MARKER flag, so reruns
skip users who already have seeded apps.
"""

import structlog
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection

from database import get_collection
from seed.applications import DEMO_MARKER, build_demo_applications
from seed.events import build_demo_events
from seed.notifications import build_demo_notifications

logger = structlog.get_logger()


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
