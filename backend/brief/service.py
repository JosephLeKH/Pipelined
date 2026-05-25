"""Morning brief read and on-demand generation logic."""

import datetime as dt
from zoneinfo import ZoneInfo

from bson import ObjectId

from auth.constants import DEFAULT_TIMEZONE
from brief.mission_scorer import missions_to_dicts, score_missions
from brief.mission_state import (
    build_mission_progress,
    complete_mission,
    filter_active_missions,
    get_mission_state,
    snooze_mission,
)
from database import get_collection
from notifications.morning_brief import (
    generate_and_store_brief,
    get_brief_for_date,
    list_brief_history,
    brief_doc_to_response,
)

ON_DEMAND_GEN_LIMIT = 3
ON_DEMAND_WINDOW_HOURS = 1


async def _local_date_for_user(user_id: str) -> str:
    users_col = get_collection("users")
    user = await users_col.find_one({"_id": ObjectId(user_id)}, {"timezone": 1})
    tz = ZoneInfo((user or {}).get("timezone", DEFAULT_TIMEZONE))
    return dt.datetime.now(dt.timezone.utc).astimezone(tz).date().isoformat()


async def build_today_brief_payload(user_id: str, doc: dict) -> dict:
    """Map a stored brief doc to API payload with filtered missions and progress."""
    sections = doc.get("sections", {})
    all_missions = missions_to_dicts(score_missions(sections))
    state = await get_mission_state(user_id, doc["date"])
    active_missions = filter_active_missions(all_missions, state)
    for rank, mission in enumerate(active_missions, start=1):
        mission["priority"] = rank
    response = brief_doc_to_response(doc)
    response["missions"] = active_missions
    response["mission_progress"] = build_mission_progress(all_missions, state)
    return response


async def get_today_brief_response(
    user_id: str, *, allow_generate: bool = True, force: bool = False
) -> dict | None:
    """Return today's brief API payload with missions and progress."""
    doc = await get_today_brief(user_id, allow_generate=allow_generate, force=force)
    if doc is None:
        return None
    return await build_today_brief_payload(user_id, doc)


async def snooze_mission_for_user(
    user_id: str,
    mission_id: str,
    *,
    until: dt.datetime | None = None,
) -> dict:
    """Snooze a mission and return updated mission state."""
    return await snooze_mission(user_id, mission_id, until=until)


async def complete_mission_for_user(user_id: str, mission_id: str) -> dict:
    """Mark a mission done and return updated mission state."""
    return await complete_mission(user_id, mission_id)


async def get_today_brief(
    user_id: str, *, allow_generate: bool = True, force: bool = False
) -> dict | None:
    """Return today's brief.

    When ``force`` is True, regenerate even if a brief already exists for today
    (still subject to the on-demand quota). When False, return the stored brief
    if one exists; otherwise generate on demand when ``allow_generate`` is True.
    """
    local_date = await _local_date_for_user(user_id)
    if not force:
        stored = await get_brief_for_date(user_id, local_date)
        if stored or not allow_generate:
            return stored
    if not await _can_generate_on_demand(user_id):
        return None
    await _record_on_demand_generation(user_id)
    return await generate_and_store_brief(user_id, local_date)


async def _can_generate_on_demand(user_id: str) -> bool:
    col = get_collection("morning_brief_on_demand")
    cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=ON_DEMAND_WINDOW_HOURS)
    count = await col.count_documents({
        "user_id": ObjectId(user_id),
        "created_at": {"$gte": cutoff},
    })
    return count < ON_DEMAND_GEN_LIMIT


async def _record_on_demand_generation(user_id: str) -> None:
    col = get_collection("morning_brief_on_demand")
    await col.insert_one({
        "user_id": ObjectId(user_id),
        "created_at": dt.datetime.now(dt.timezone.utc),
    })


async def get_brief_history(user_id: str, days: int) -> list[dict]:
    """Return brief history mapped for API responses."""
    docs = await list_brief_history(user_id, days)
    return [brief_doc_to_response(doc) for doc in docs]
