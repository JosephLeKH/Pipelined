"""Auto-draft follow-up emails for stale applications."""

import asyncio
from datetime import datetime, timedelta, timezone

import structlog
from bson import ObjectId

from applications.interview_prep.service import generate_follow_up_draft
from database import get_collection
from notifications.notification_service import create_notification

logger = structlog.get_logger()

STALE_APP_DAYS: int = 14
STALE_FOLLOWUP_STAGES: list[str] = ["Applied", "OA", "Phone Screen"]


async def _process_stale_app(user_id: str, user_id_oid: ObjectId, app: dict) -> bool:
    """Generate and save a follow-up draft for one stale app. Returns True on success."""
    app_id = str(app["_id"])
    company = app.get("company", "")
    try:
        draft = await generate_follow_up_draft(user_id, app_id, app)
    except Exception:
        logger.exception("stale_followup_draft_failed", app_id=app_id)
        return False

    now = datetime.now(timezone.utc)
    apps_col = get_collection("applications")
    await apps_col.update_one(
        {"_id": app["_id"], "user_id": user_id_oid},
        {"$set": {"follow_up_draft": draft, "follow_up_draft_generated_at": now}},
    )
    await create_notification(
        user_id_oid,
        type="follow_up_due",
        title="Follow-up draft ready",
        body=f"We drafted a follow-up for {company}",
        action_url=f"/dashboard?selected={app_id}",
    )
    return True


async def auto_draft_stale_followups(user_id: str) -> int:
    """Generate follow-up drafts for stale applications. Returns count generated."""
    user_id_oid = ObjectId(user_id)
    cutoff = datetime.now(timezone.utc) - timedelta(days=STALE_APP_DAYS)
    apps_col = get_collection("applications")

    stale_apps = await apps_col.find({
        "user_id": user_id_oid,
        "current_stage": {"$in": STALE_FOLLOWUP_STAGES},
        "updated_at": {"$lt": cutoff},
        "follow_up_draft": None,
        "deleted": {"$ne": True},
        "archived": {"$ne": True},
    }).to_list(length=None)

    if not stale_apps:
        return 0

    results = await asyncio.gather(
        *[_process_stale_app(user_id, user_id_oid, app) for app in stale_apps],
        return_exceptions=True,
    )
    return sum(1 for r in results if r is True)
