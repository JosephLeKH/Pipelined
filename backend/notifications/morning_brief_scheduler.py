"""Timezone-aware scheduler entrypoint for morning brief delivery."""

import datetime as dt
from zoneinfo import ZoneInfo

import structlog

from auth.constants import DEFAULT_MORNING_BRIEF_HOUR, DEFAULT_MORNING_BRIEF_IN_APP, DEFAULT_TIMEZONE
from database import get_collection
from notifications.morning_brief import (
    NOTIFICATION_TYPE_MORNING_BRIEF,
    generate_and_store_brief,
    get_brief_for_date,
)
from notifications.morning_brief_email import send_morning_brief_email
from notifications.notification_service import create_notification

logger = structlog.get_logger()


def is_user_due_for_brief(user_doc: dict, now_utc: dt.datetime | None = None) -> tuple[bool, str]:
    """Return whether the user's local hour matches their brief hour and today's date."""
    if user_doc.get("morning_brief_enabled", True) is False:
        return False, ""
    tz = ZoneInfo(user_doc.get("timezone", DEFAULT_TIMEZONE))
    now = (now_utc or dt.datetime.now(dt.timezone.utc)).astimezone(tz)
    target_hour = user_doc.get("morning_brief_hour", DEFAULT_MORNING_BRIEF_HOUR)
    if now.hour != target_hour:
        return False, now.date().isoformat()
    return True, now.date().isoformat()


async def send_due_morning_briefs(now_utc: dt.datetime | None = None) -> None:
    """Generate briefs for users whose local brief hour matches now."""
    users_col = get_collection("users")
    cursor = users_col.find({"morning_brief_enabled": {"$ne": False}})
    async for user in cursor:
        due, local_date = is_user_due_for_brief(user, now_utc)
        if not due:
            continue
        user_id = str(user["_id"])
        existing = await get_brief_for_date(user_id, local_date)
        if existing:
            continue
        stored = await generate_and_store_brief(user_id, local_date)
        if user.get("morning_brief_email", True):
            await send_morning_brief_email(user, stored)
        if user.get("morning_brief_in_app", DEFAULT_MORNING_BRIEF_IN_APP):
            await create_notification(
                user["_id"],
                type=NOTIFICATION_TYPE_MORNING_BRIEF,
                title="Your morning brief is ready",
                body=stored.get("summary_line", "View your daily action list."),
                action_url="/brief",
            )
        logger.info("morning_brief_delivered", user_id=user_id, date=local_date)
