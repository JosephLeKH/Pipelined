"""Orchestrator for new-user demo data: applications, calendar events, notifications.

Purpose: peer reviewers and demo recordings land on a populated dashboard
instead of an empty state. Idempotent via the DEMO_MARKER flag, so reruns
skip users who already have seeded apps.
"""

import structlog
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection
from pymongo import ReturnDocument

from auth.constants import DEFAULT_STAGES
from database import get_collection
from seed.applications import (
    DEMO_MARKER,
    build_demo_applications,
    build_openai_offer,
)
from seed.events import build_demo_events
from seed.notifications import build_demo_notifications
from seed.pending import build_demo_job_listings, build_demo_pending_opportunities

logger = structlog.get_logger()

# Cap the per-startup backfill scan so a huge users collection never blocks
# startup. Idempotent — subsequent restarts pick up where this left off.
BACKFILL_BATCH_SIZE = 1000


async def _already_seeded(apps: AsyncIOMotorCollection, uid: ObjectId) -> bool:
    existing = await apps.find_one(
        {"user_id": uid, DEMO_MARKER: True}, projection={"_id": 1}
    )
    return existing is not None


async def _backfill_openai_offer(
    apps: AsyncIOMotorCollection,
    uid: ObjectId,
    stages: list[str],
) -> bool:
    """Insert the OpenAI Offer-stage app for users seeded before the second
    offer existed. No-op if the user already has it.

    Returns True if inserted.
    """
    existing = await apps.find_one(
        {"user_id": uid, DEMO_MARKER: True, "normalised_company": "openai"},
        projection={"_id": 1},
    )
    if existing is not None:
        return False

    await apps.insert_one(build_openai_offer(uid, stages))
    return True


async def _backfill_notification_urls(
    notifications: AsyncIOMotorCollection,
    apps: AsyncIOMotorCollection,
    uid: ObjectId,
) -> int:
    """Repair existing demo notifications missing action_url (pre-fix data).

    Returns the count of notifications updated.
    """
    missing = await notifications.count_documents(
        {"user_id": uid, DEMO_MARKER: True, "action_url": None}
    )
    if missing == 0:
        return 0

    stripe = await apps.find_one(
        {"user_id": uid, DEMO_MARKER: True, "company": "Stripe"}, projection={"_id": 1}
    )
    google = await apps.find_one(
        {"user_id": uid, DEMO_MARKER: True, "company": "Google"}, projection={"_id": 1}
    )
    if not stripe or not google:
        return 0

    updates = [
        ({"type": "welcome"}, "/today"),
        ({"type": "interview_tomorrow"}, f"/dashboard?selected={stripe['_id']}"),
        (
            {"type": "follow_up_due"},
            f"/dashboard?selected={google['_id']}&action=follow-up",
        ),
    ]
    fixed = 0
    for type_filter, url in updates:
        result = await notifications.update_many(
            {"user_id": uid, DEMO_MARKER: True, "action_url": None, **type_filter},
            {"$set": {"action_url": url}},
        )
        fixed += result.modified_count
    return fixed


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
            inserted_openai = await _backfill_openai_offer(apps, uid, stages)
            if inserted_openai:
                logger.info("demo_openai_offer_backfilled", user_id=user_id)
            fixed = await _backfill_notification_urls(notifications, apps, uid)
            if fixed:
                logger.info("demo_notification_urls_backfilled", user_id=user_id, fixed=fixed)
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

        notification_docs = build_demo_notifications(uid, apps_by_company)
        if notification_docs:
            await notifications.insert_many(notification_docs)

        pending_count = await _seed_pending_opportunities(uid)

        logger.info(
            "demo_seed_complete",
            user_id=user_id,
            app_count=len(app_docs),
            event_count=len(event_docs),
            notification_count=len(notification_docs),
            pending_count=pending_count,
        )
        return len(app_docs)
    except Exception as exc:
        # Demo seed is never load-bearing — log and continue so signup succeeds.
        logger.warning("demo_seed_failed", user_id=user_id, error=str(exc))
        return 0


async def _seed_pending_opportunities(uid: ObjectId) -> int:
    """Insert paired job_listings + pending_opportunities for this user.

    Listings are upserted on url_hash so reseeding doesn't duplicate them
    in the global listings collection. Pending opportunities are inserted
    fresh per user.
    """
    listings = get_collection("job_listings")
    pending = get_collection("pending_opportunities")

    listing_docs = build_demo_job_listings(uid)
    listing_ids_by_company: dict[str, ObjectId] = {}
    for doc in listing_docs:
        result = await listings.find_one_and_update(
            {"url_hash": doc["url_hash"]},
            {"$setOnInsert": doc},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        listing_ids_by_company[doc["company"]] = result["_id"]

    pending_docs = build_demo_pending_opportunities(uid, listing_ids_by_company)
    if pending_docs:
        await pending.insert_many(pending_docs)
    return len(pending_docs)


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
