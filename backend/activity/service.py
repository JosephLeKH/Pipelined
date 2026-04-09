"""Activity feed: unified chronological timeline of user actions."""

import asyncio
import datetime as dt

import structlog
from bson import ObjectId

from database import get_collection

logger = structlog.get_logger()

MAX_ACTIVITY_ENTRIES: int = 200
DEFAULT_ACTIVITY_DAYS: int = 30
MAX_ACTIVITY_DAYS: int = 365


def _cutoff(days: int) -> dt.datetime | None:
    """Return UTC cutoff datetime for the given number of days (None = all time)."""
    if days <= 0:
        return None
    return dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=days)


def _ensure_utc(ts: dt.datetime) -> dt.datetime:
    """Attach UTC timezone to a naive datetime; return aware datetimes unchanged."""
    if ts.tzinfo is None:
        return ts.replace(tzinfo=dt.timezone.utc)
    return ts


async def _applied_events(user_id: ObjectId, cutoff: dt.datetime | None) -> list[dict]:
    """Return 'applied' activity entries from applications collection."""
    col = get_collection("applications")
    filt: dict = {"user_id": user_id, "archived": {"$ne": True}}
    if cutoff:
        filt["date_applied"] = {"$gte": cutoff}
    projection = {"_id": 1, "company": 1, "role_title": 1, "date_applied": 1}
    docs = await col.find(filt, projection).to_list(length=MAX_ACTIVITY_ENTRIES)
    return [
        {
            "type": "applied",
            "timestamp": doc["date_applied"],
            "application_id": str(doc["_id"]),
            "company": doc.get("company", ""),
            "role_title": doc.get("role_title", ""),
            "details": {},
        }
        for doc in docs
        if doc.get("date_applied")
    ]


async def _stage_change_events(user_id: ObjectId, cutoff: dt.datetime | None) -> list[dict]:
    """Return 'stage_change' activity entries from applications.stage_history."""
    col = get_collection("applications")
    filt: dict = {"user_id": user_id, "archived": {"$ne": True}, "stage_history.1": {"$exists": True}}
    projection = {"_id": 1, "company": 1, "role_title": 1, "stage_history": 1}
    docs = await col.find(filt, projection).to_list(length=MAX_ACTIVITY_ENTRIES)

    events: list[dict] = []
    for doc in docs:
        history = doc.get("stage_history", [])
        for i in range(1, len(history)):
            entry = history[i]
            prev = history[i - 1]
            ts = entry.get("transitioned_at")
            if not ts:
                continue
            ts = _ensure_utc(ts)
            if cutoff and ts < cutoff:
                continue
            events.append({
                "type": "stage_change",
                "timestamp": ts,
                "application_id": str(doc["_id"]),
                "company": doc.get("company", ""),
                "role_title": doc.get("role_title", ""),
                "details": {
                    "from_stage": prev.get("stage", ""),
                    "to_stage": entry.get("stage", ""),
                },
            })
    return events


async def _event_created_events(user_id: ObjectId, cutoff: dt.datetime | None) -> list[dict]:
    """Return 'event_created' activity entries from calendar_events collection."""
    col = get_collection("calendar_events")
    filt: dict = {"user_id": user_id}
    if cutoff:
        filt["created_at"] = {"$gte": cutoff}
    projection = {"_id": 1, "application_id": 1, "company": 1, "role_title": 1, "event_type": 1, "created_at": 1}
    docs = await col.find(filt, projection).to_list(length=MAX_ACTIVITY_ENTRIES)
    return [
        {
            "type": "event_created",
            "timestamp": doc["created_at"],
            "application_id": str(doc.get("application_id", "")),
            "company": doc.get("company", ""),
            "role_title": doc.get("role_title", ""),
            "details": {"event_type": doc.get("event_type", "interview")},
        }
        for doc in docs
        if doc.get("created_at")
    ]


async def get_activity_feed(user_id: ObjectId, days: int) -> tuple[list[dict], int]:
    """Return (entries, total) for the user's activity feed."""
    cutoff = _cutoff(days)
    applied, stage_changes, cal_events = await asyncio.gather(
        _applied_events(user_id, cutoff),
        _stage_change_events(user_id, cutoff),
        _event_created_events(user_id, cutoff),
    )
    combined = applied + stage_changes + cal_events
    combined.sort(key=lambda e: _ensure_utc(e["timestamp"]), reverse=True)
    total = len(combined)
    return combined[:MAX_ACTIVITY_ENTRIES], total
