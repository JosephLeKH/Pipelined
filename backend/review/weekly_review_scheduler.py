"""Timezone-aware scheduler for weekly pipeline reviews."""

import datetime as dt
from zoneinfo import ZoneInfo

import structlog

from ai.agent_log import AGENT_TYPE_REVIEW, STATUS_SUCCESS, log_agent_run
from auth.constants import DEFAULT_TIMEZONE, DEFAULT_WEEKLY_REVIEW_HOUR, DEFAULT_WEEKLY_REVIEW_WEEKDAY
from database import get_collection
from review.service import generate_and_store_review, get_review_for_week
from review.weekly_review import _week_start_for_user

logger = structlog.get_logger()


def is_user_due_for_weekly_review(user_doc: dict, now_utc: dt.datetime | None = None) -> tuple[bool, str]:
    """Return whether the user's local Monday review hour matches now."""
    if user_doc.get("weekly_review_enabled", True) is False:
        return False, ""
    tz = ZoneInfo(user_doc.get("timezone", DEFAULT_TIMEZONE))
    now = (now_utc or dt.datetime.now(dt.timezone.utc)).astimezone(tz)
    target_hour = user_doc.get("weekly_review_hour", DEFAULT_WEEKLY_REVIEW_HOUR)
    target_weekday = user_doc.get("weekly_review_weekday", DEFAULT_WEEKLY_REVIEW_WEEKDAY)
    if now.weekday() != target_weekday or now.hour != target_hour:
        return False, _week_start_for_user(user_doc, now)
    return True, _week_start_for_user(user_doc, now)


async def generate_due_weekly_reviews(now_utc: dt.datetime | None = None) -> None:
    """Generate weekly reviews for users whose local schedule matches now."""
    users_col = get_collection("users")
    cursor = users_col.find({"weekly_review_enabled": {"$ne": False}})
    async for user in cursor:
        due, week_start = is_user_due_for_weekly_review(user, now_utc)
        if not due:
            continue
        user_id = str(user["_id"])
        existing = await get_review_for_week(user_id, week_start)
        if existing:
            continue
        stored = await generate_and_store_review(user_id, week_start)
        summary = (
            f"Response {int(stored.get('response_rate', 0) * 100)}%, "
            f"ghost {int(stored.get('ghost_rate', 0) * 100)}%"
        )
        await log_agent_run(user_id, AGENT_TYPE_REVIEW, STATUS_SUCCESS, summary)
        logger.info("weekly_review_generated", user_id=user_id, week_start=week_start)
