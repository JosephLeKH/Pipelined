"""Weekly email digest: builds a job search summary and sends it to opted-in users."""

import datetime as dt
from dataclasses import dataclass, field

import structlog
from bson import ObjectId

from config import settings
from database import get_collection
from notifications.email_service import email_service

logger = structlog.get_logger()

STALE_APP_DAYS: int = 14
DIGEST_LOOKAHEAD_DAYS: int = 7
DIGEST_LOOKBACK_DAYS: int = 7
DIGEST_SUBJECT: str = "Your weekly Pipelined job search summary"


@dataclass
class StaleApp:
    company: str
    role_title: str
    days_since_update: int


@dataclass
class UpcomingEvent:
    role_title: str
    company: str
    event_date: str
    event_time: str | None


@dataclass
class WeeklyDigest:
    display_name: str
    new_apps_this_week: int
    total_active_apps: int
    stale_apps: list[StaleApp] = field(default_factory=list)
    upcoming_events: list[UpcomingEvent] = field(default_factory=list)


async def build_weekly_digest(user_id: str) -> WeeklyDigest:
    """Query MongoDB to build a WeeklyDigest for the given user."""
    uid = ObjectId(user_id)
    apps_col = get_collection("applications")
    events_col = get_collection("calendar_events")
    users_col = get_collection("users")

    now = dt.datetime.now(dt.timezone.utc)
    week_ago = now - dt.timedelta(days=DIGEST_LOOKBACK_DAYS)
    stale_cutoff = now - dt.timedelta(days=STALE_APP_DAYS)
    today = dt.datetime.combine(dt.date.today(), dt.time.min, tzinfo=dt.timezone.utc)
    lookahead_date = today + dt.timedelta(days=DIGEST_LOOKAHEAD_DAYS)

    user, new_count, active_count, stale_docs, event_docs = await _gather_data(
        uid, apps_col, events_col, users_col,
        week_ago, stale_cutoff, today, lookahead_date,
    )

    display_name: str = user.get("display_name", "there") if user else "there"

    stale_apps: list[StaleApp] = [
        StaleApp(
            company=doc.get("company") or "Unknown",
            role_title=doc.get("role_title") or "Unknown Role",
            days_since_update=max(0, (now - doc["updated_at"].replace(tzinfo=dt.timezone.utc)).days),
        )
        for doc in stale_docs
    ]

    upcoming: list[UpcomingEvent] = [
        UpcomingEvent(
            role_title=doc.get("role_title") or "Interview",
            company=doc.get("company") or "Unknown",
            event_date=str(doc["date"].date() if isinstance(doc["date"], dt.datetime) else doc["date"]),  # noqa: SIM210
            event_time=str(doc["time"]) if doc.get("time") else None,
        )
        for doc in event_docs
    ]

    return WeeklyDigest(
        display_name=display_name,
        new_apps_this_week=new_count,
        total_active_apps=active_count,
        stale_apps=stale_apps,
        upcoming_events=upcoming,
    )


async def _gather_data(
    uid: ObjectId,
    apps_col,
    events_col,
    users_col,
    week_ago: dt.datetime,
    stale_cutoff: dt.datetime,
    today: dt.date,
    lookahead_date: dt.date,
) -> tuple:
    """Run all MongoDB queries concurrently and return raw results."""
    import asyncio  # noqa: PLC0415 — local import to avoid circular

    base_filter = {"user_id": uid, "archived": {"$ne": True}}

    user_task = users_col.find_one({"_id": uid})
    new_count_task = apps_col.count_documents({**base_filter, "created_at": {"$gte": week_ago}})
    active_count_task = apps_col.count_documents(base_filter)
    stale_task = apps_col.find(
        {**base_filter, "updated_at": {"$lt": stale_cutoff}},
        {"company": 1, "role_title": 1, "updated_at": 1},
    ).to_list(length=10)
    events_task = events_col.find(
        {"user_id": uid, "date": {"$gte": today, "$lte": lookahead_date}},
        {"company": 1, "role_title": 1, "date": 1, "time": 1},
    ).sort("date", 1).to_list(length=10)

    return await asyncio.gather(
        user_task, new_count_task, active_count_task, stale_task, events_task
    )


def _build_digest_body(digest: WeeklyDigest) -> str:
    """Render the digest as a plain-text email body."""
    lines = [
        f"Hi {digest.display_name},",
        "",
        "Here is your weekly Pipelined job search summary:",
        "",
        f"New applications this week: {digest.new_apps_this_week}",
        f"Total active applications:  {digest.total_active_apps}",
    ]

    if digest.stale_apps:
        lines += ["", "Applications with no update in the past 14+ days:"]
        for app in digest.stale_apps:
            lines.append(f"  - {app.company}: {app.role_title} ({app.days_since_update} days ago)")

    if digest.upcoming_events:
        lines += ["", "Upcoming interviews in the next 7 days:"]
        for ev in digest.upcoming_events:
            time_str = f" at {ev.event_time}" if ev.event_time else ""
            lines.append(f"  - {ev.company}: {ev.role_title} on {ev.event_date}{time_str}")

    lines += [
        "",
        f"View your full pipeline: {settings.frontend_url}",
        "",
        "---",
        "Pipelined Weekly Digest",
        "To unsubscribe, go to Settings > Weekly digest email.",
    ]
    return "\n".join(lines)


async def send_weekly_digest(user_id: str) -> bool:
    """Build and send the weekly digest for a user. Returns True on success."""
    try:
        digest = await build_weekly_digest(user_id)
        users_col = get_collection("users")
        user = await users_col.find_one({"_id": ObjectId(user_id)}, {"email": 1})
        if not user:
            logger.warning("digest_user_not_found", user_id=user_id)
            return False
        body = _build_digest_body(digest)
        await email_service.send_text_email(user["email"], DIGEST_SUBJECT, body)
        logger.info("weekly_digest_sent", user_id=user_id)
        return True
    except Exception:
        logger.exception("weekly_digest_failed", user_id=user_id)
        return False


async def send_all_digests() -> None:
    """Send weekly digest to all users with digest_enabled=True."""
    users_col = get_collection("users")
    cursor = users_col.find({"digest_enabled": {"$ne": False}}, {"_id": 1})
    async for user in cursor:
        await send_weekly_digest(str(user["_id"]))
