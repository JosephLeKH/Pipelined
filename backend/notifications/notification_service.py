"""In-app notification CRUD and generation logic."""

import asyncio
import datetime as dt

import structlog
from bson import ObjectId
from pymongo import ReturnDocument

from database import get_collection

logger = structlog.get_logger()

# SSE connection pool: maps user_id (str) to list of asyncio.Queue
_sse_connections: dict[str, list[asyncio.Queue]] = {}


def register_sse_queue(user_id_str: str, queue: asyncio.Queue) -> None:
    """Register a new SSE queue for a user connection."""
    if user_id_str not in _sse_connections:
        _sse_connections[user_id_str] = []
    _sse_connections[user_id_str].append(queue)


def unregister_sse_queue(user_id_str: str, queue: asyncio.Queue) -> None:
    """Remove an SSE queue when a client disconnects."""
    if user_id_str not in _sse_connections:
        return
    try:
        _sse_connections[user_id_str].remove(queue)
    except ValueError:
        pass
    if not _sse_connections[user_id_str]:
        del _sse_connections[user_id_str]


async def _broadcast_to_sse_connections(user_id: ObjectId, notification: dict) -> None:
    """Push notification to all active SSE connections for this user."""
    user_id_str = str(user_id)
    if user_id_str not in _sse_connections:
        return

    queues = _sse_connections[user_id_str]
    dead_queues = []
    for q in queues:
        try:
            q.put_nowait(notification)
        except asyncio.QueueFull:
            dead_queues.append(q)

    for q in dead_queues:
        queues.remove(q)
        logger.info("sse_dead_queue_removed", user_id=user_id_str)

    if not queues:
        del _sse_connections[user_id_str]



NOTIFICATION_TTL_DAYS: int = 30
MAX_STALE_NOTIFICATIONS_PER_RUN: int = 5
STALE_NOTIFICATION_DEDUP_DAYS: int = 7
STALE_APP_DAYS: int = 14
NOTIFICATION_LIST_LIMIT: int = 50

ALLOWED_NOTIFICATION_TYPES: frozenset[str] = frozenset({
    "stale_app",
    "interview_tomorrow",
    "follow_up_due",
    "morning_brief_ready",
    "interview_prep_ready",
    "saved_search_match",
})


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


async def create_notification(
    user_id: ObjectId,
    type: str,
    title: str,
    body: str,
    action_url: str | None = None,
) -> str:
    """Insert a new in-app notification and return its string ID."""
    if type not in ALLOWED_NOTIFICATION_TYPES:
        raise ValueError(f"Unsupported notification type: {type}")
    col = get_collection("notifications")
    now = _now()
    doc = {
        "user_id": user_id,
        "type": type,
        "title": title,
        "body": body,
        "action_url": action_url,
        "read": False,
        "created_at": now,
    }
    result = await col.insert_one(doc)
    logger.info("notification_created", user_id=str(user_id), type=type)
    notification_id = str(result.inserted_id)
    notification_dict = {
        '_id': result.inserted_id,
        'user_id': user_id,
        'type': type,
        'title': title,
        'body': body,
        'action_url': action_url,
        'read': False,
        'created_at': now,
    }
    await _broadcast_to_sse_connections(user_id, notification_dict)
    return notification_id


async def list_notifications(
    user_id: ObjectId,
    limit: int = NOTIFICATION_LIST_LIMIT,
    unread_only: bool = False,
) -> list[dict]:
    """Return the most-recent notifications for a user, newest first."""
    col = get_collection("notifications")
    filt: dict = {"user_id": user_id}
    if unread_only:
        filt["read"] = False
    cursor = col.find(filt).sort("created_at", -1).limit(limit)
    return await cursor.to_list(length=limit)


async def get_unread_count(user_id: ObjectId) -> int:
    """Return the count of unread notifications for a user."""
    col = get_collection("notifications")
    return await col.count_documents({"user_id": user_id, "read": False})


async def mark_read(user_id: ObjectId, notification_id: str) -> bool:
    """Mark a single notification as read. Returns True if found and updated."""
    col = get_collection("notifications")
    doc = await col.find_one_and_update(
        {"_id": ObjectId(notification_id), "user_id": user_id},
        {"$set": {"read": True}},
        return_document=ReturnDocument.AFTER,
    )
    return doc is not None


async def mark_all_read(user_id: ObjectId) -> int:
    """Mark all notifications for a user as read. Returns count marked."""
    col = get_collection("notifications")
    result = await col.update_many(
        {"user_id": user_id, "read": False},
        {"$set": {"read": True}},
    )
    logger.info("notifications_all_read", user_id=str(user_id), count=result.modified_count)
    return result.modified_count


async def _dedup_recent(user_id: ObjectId, type: str, ref_id: str) -> bool:
    """Return True if a notification of this type+ref already exists within DEDUP window."""
    col = get_collection("notifications")
    cutoff = _now() - dt.timedelta(days=STALE_NOTIFICATION_DEDUP_DAYS)
    existing = await col.find_one({
        "user_id": user_id,
        "type": type,
        "action_url": {"$regex": ref_id},
        "created_at": {"$gte": cutoff},
    })
    return existing is not None


async def generate_notifications() -> None:
    """Generate stale-app, interview-tomorrow, and follow-up-due notifications."""
    logger.info("notification_generation_started")
    await asyncio.gather(
        _generate_stale_app_notifications(),
        _generate_interview_tomorrow_notifications(),
        _generate_follow_up_due_notifications(),
    )
    logger.info("notification_generation_completed")


async def _generate_stale_app_notifications() -> None:
    """Create stale_app notifications for applications not updated in 14+ days."""
    apps_col = get_collection("applications")
    users_col = get_collection("users")
    stale_cutoff = _now() - dt.timedelta(days=STALE_APP_DAYS)

    cursor = users_col.find({}, {"_id": 1})
    async for user in cursor:
        uid = user["_id"]
        stale_apps = await apps_col.find(
            {"user_id": uid, "archived": {"$ne": True}, "updated_at": {"$lt": stale_cutoff}},
            {"_id": 1, "company": 1, "role_title": 1},
        ).limit(MAX_STALE_NOTIFICATIONS_PER_RUN).to_list(length=MAX_STALE_NOTIFICATIONS_PER_RUN)

        for app in stale_apps:
            app_id = str(app["_id"])
            if await _dedup_recent(uid, "stale_app", app_id):
                continue
            company = app.get("company") or "Unknown"
            role = app.get("role_title") or "Application"
            await create_notification(
                uid,
                type="stale_app",
                title=f"No update: {company}",
                body=f"Your {role} application at {company} hasn't been updated in 14+ days.",
                action_url=f"/dashboard?selected={app_id}&action=follow-up",
            )


async def _generate_interview_tomorrow_notifications() -> None:
    """Create interview_tomorrow notifications for events scheduled for tomorrow."""
    events_col = get_collection("calendar_events")
    tomorrow = dt.date.today() + dt.timedelta(days=1)
    tomorrow_start = dt.datetime.combine(tomorrow, dt.time.min, tzinfo=dt.timezone.utc)
    tomorrow_end = dt.datetime.combine(tomorrow, dt.time.max, tzinfo=dt.timezone.utc)

    # SYSTEM: intentional cross-user query for batch notification generation (extracts user_id from documents)
    cursor = events_col.find(
        {"date": {"$gte": tomorrow_start, "$lte": tomorrow_end}},
        {"_id": 1, "user_id": 1, "company": 1, "role_title": 1, "event_type": 1},
    )
    async for event in cursor:
        uid = event["user_id"]
        event_id = str(event["_id"])
        if await _dedup_recent(uid, "interview_tomorrow", event_id):
            continue
        company = event.get("company") or "Unknown"
        event_type = (event.get("event_type") or "interview").replace("_", " ")
        await create_notification(
            uid,
            type="interview_tomorrow",
            title=f"Interview tomorrow: {company}",
            body=f"You have a {event_type} with {company} tomorrow.",
            action_url=f"/calendar",
        )


async def _generate_follow_up_due_notifications() -> None:
    """Create follow_up_due notifications for overdue follow-up dates."""
    apps_col = get_collection("applications")
    today_start = dt.datetime.combine(dt.date.today(), dt.time.min, tzinfo=dt.timezone.utc)

    # SYSTEM: intentional cross-user query for batch notification generation (extracts user_id from documents)
    cursor = apps_col.find(
        {
            "archived": {"$ne": True},
            "follow_up_date": {"$lt": today_start, "$ne": None},
        },
        {"_id": 1, "user_id": 1, "company": 1, "role_title": 1},
    )
    async for app in cursor:
        uid = app["user_id"]
        app_id = str(app["_id"])
        if await _dedup_recent(uid, "follow_up_due", app_id):
            continue
        company = app.get("company") or "Unknown"
        role = app.get("role_title") or "Application"
        await create_notification(
            uid,
            type="follow_up_due",
            title=f"Follow-up overdue: {company}",
            body=f"Your follow-up for the {role} role at {company} is overdue.",
            action_url=f"/dashboard?selected={app_id}&action=follow-up",
        )
