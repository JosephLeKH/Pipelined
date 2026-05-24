"""Morning brief section for upcoming OA/take-home deadlines."""

import datetime as dt

from bson import ObjectId

from database import get_collection
from notifications.morning_brief import BriefItem, MAX_SECTION_ITEMS

OA_DEADLINE_LOOKAHEAD_DAYS = 7
OA_STAGES = frozenset({"OA", "Assessment"})


def days_until_deadline(deadline: dt.datetime, today: dt.date) -> int:
    """Return signed days until deadline (negative when overdue)."""
    deadline_date = deadline.astimezone(dt.timezone.utc).date()
    return (deadline_date - today).days


def oa_deadline_body(days_remaining: int) -> str:
    """Human-readable body text for an OA deadline brief item."""
    if days_remaining < 0:
        overdue = abs(days_remaining)
        day_word = "day" if overdue == 1 else "days"
        return f"Overdue by {overdue} {day_word}"
    if days_remaining == 0:
        return "Due today"
    day_word = "day" if days_remaining == 1 else "days"
    return f"Due in {days_remaining} {day_word}"


async def fetch_oa_deadlines(uid: ObjectId, today: dt.date) -> list[BriefItem]:
    """Return applications with OA deadlines within the lookahead window."""
    lookahead_end = today + dt.timedelta(days=OA_DEADLINE_LOOKAHEAD_DAYS)
    lookahead_end_dt = dt.datetime.combine(
        lookahead_end, dt.time.max, tzinfo=dt.timezone.utc,
    )

    docs = await get_collection("applications").find(
        {
            "user_id": uid,
            "archived": {"$ne": True},
            "deleted": {"$ne": True},
            "current_stage": {"$in": list(OA_STAGES)},
            "deadline": {"$ne": None, "$lte": lookahead_end_dt},
        },
        {"_id": 1, "company": 1, "role_title": 1, "deadline": 1},
    ).sort("deadline", 1).limit(MAX_SECTION_ITEMS).to_list(length=MAX_SECTION_ITEMS)

    items: list[BriefItem] = []
    for doc in docs:
        deadline = doc.get("deadline")
        if deadline is None:
            continue
        if isinstance(deadline, dt.datetime) and deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=dt.timezone.utc)
        days_remaining = days_until_deadline(deadline, today)
        if days_remaining > OA_DEADLINE_LOOKAHEAD_DAYS:
            continue
        company = doc.get("company") or "Unknown"
        role = doc.get("role_title") or "OA"
        app_id = str(doc["_id"])
        items.append(BriefItem(
            title=f"{company} — {role}",
            body=oa_deadline_body(days_remaining),
            action_url=f"/dashboard?selected={app_id}",
            entity_id=app_id,
        ))
    return items
