"""Morning brief read and on-demand generation logic."""

import datetime as dt
from zoneinfo import ZoneInfo

from bson import ObjectId

from auth.constants import DEFAULT_TIMEZONE
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


async def get_today_brief(user_id: str, *, allow_generate: bool = True) -> dict | None:
    """Return today's brief, optionally generating on demand when missing."""
    local_date = await _local_date_for_user(user_id)
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
