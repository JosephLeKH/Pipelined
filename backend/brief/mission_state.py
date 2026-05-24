"""Persist snooze and done state for daily brief missions."""

import datetime as dt
from zoneinfo import ZoneInfo

from bson import ObjectId

from auth.constants import DEFAULT_TIMEZONE
from database import get_collection

SNOOZE_DEFAULT_DAYS = 1


def _as_utc(value: dt.datetime) -> dt.datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=dt.timezone.utc)
    return value.astimezone(dt.timezone.utc)


async def _local_date_for_user(user_id: str) -> str:
    users_col = get_collection("users")
    user = await users_col.find_one({"_id": ObjectId(user_id)}, {"timezone": 1})
    tz = ZoneInfo((user or {}).get("timezone", DEFAULT_TIMEZONE))
    return dt.datetime.now(dt.timezone.utc).astimezone(tz).date().isoformat()


def _default_snooze_until(user_timezone: str) -> dt.datetime:
    tz = ZoneInfo(user_timezone or DEFAULT_TIMEZONE)
    now_local = dt.datetime.now(dt.timezone.utc).astimezone(tz)
    target_date = now_local.date() + dt.timedelta(days=SNOOZE_DEFAULT_DAYS)
    end_of_day = dt.datetime.combine(target_date, dt.time.max, tzinfo=tz)
    return end_of_day.astimezone(dt.timezone.utc)


async def get_mission_state(user_id: str, local_date: str | None = None) -> dict:
    """Return snooze and completed mission ids for the user's local date."""
    date = local_date or await _local_date_for_user(user_id)
    col = get_collection("brief_mission_state")
    doc = await col.find_one({"user_id": ObjectId(user_id), "date": date})
    if not doc:
        return {"date": date, "snoozed": {}, "completed": []}
    return {
        "date": date,
        "snoozed": doc.get("snoozed", {}),
        "completed": doc.get("completed", []),
    }


async def snooze_mission(
    user_id: str,
    mission_id: str,
    *,
    until: dt.datetime | None = None,
    local_date: str | None = None,
) -> dict:
    """Snooze a mission until the given UTC datetime (default: end of next local day)."""
    date = local_date or await _local_date_for_user(user_id)
    users_col = get_collection("users")
    user = await users_col.find_one({"_id": ObjectId(user_id)}, {"timezone": 1})
    snooze_until = until or _default_snooze_until((user or {}).get("timezone", DEFAULT_TIMEZONE))
    col = get_collection("brief_mission_state")
    now = dt.datetime.now(dt.timezone.utc)
    await col.update_one(
        {"user_id": ObjectId(user_id), "date": date},
        {
            "$set": {
                f"snoozed.{mission_id}": snooze_until,
                "updated_at": now,
            },
            "$setOnInsert": {"user_id": ObjectId(user_id), "date": date, "completed": []},
        },
        upsert=True,
    )
    return await get_mission_state(user_id, date)


async def complete_mission(
    user_id: str,
    mission_id: str,
    *,
    local_date: str | None = None,
) -> dict:
    """Mark a mission as done for the user's local date."""
    date = local_date or await _local_date_for_user(user_id)
    col = get_collection("brief_mission_state")
    now = dt.datetime.now(dt.timezone.utc)
    await col.update_one(
        {"user_id": ObjectId(user_id), "date": date},
        {
            "$addToSet": {"completed": mission_id},
            "$set": {"updated_at": now},
            "$setOnInsert": {"user_id": ObjectId(user_id), "date": date, "snoozed": {}},
        },
        upsert=True,
    )
    return await get_mission_state(user_id, date)


def filter_active_missions(missions: list[dict], state: dict) -> list[dict]:
    """Exclude completed and currently snoozed missions from the active list."""
    completed = set(state.get("completed", []))
    snoozed = state.get("snoozed", {})
    now = dt.datetime.now(dt.timezone.utc)
    active: list[dict] = []
    for mission in missions:
        mission_id = mission["id"]
        if mission_id in completed:
            continue
        snooze_until = snoozed.get(mission_id)
        if snooze_until and _as_utc(snooze_until) > now:
            continue
        active.append(mission)
    return active


def build_mission_progress(all_missions: list[dict], state: dict) -> dict:
    """Return cleared/total counts for today's mission progress strip."""
    completed = state.get("completed", [])
    total = len(all_missions)
    cleared = len([mid for mid in completed if any(m["id"] == mid for m in all_missions)])
    return {"cleared": cleared, "total": total}
