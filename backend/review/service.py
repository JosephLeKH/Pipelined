"""Weekly review persistence and retrieval."""

import datetime as dt

from bson import ObjectId

from database import get_collection
from review.weekly_review import build_weekly_review, weekly_review_to_dict


async def get_review_for_week(user_id: str, week_start: str) -> dict | None:
    """Return a stored weekly review document for the given ISO week start."""
    col = get_collection("weekly_reviews")
    doc = await col.find_one({"user_id": ObjectId(user_id), "week_start": week_start})
    if not doc:
        return None
    doc.pop("_id", None)
    return doc


async def generate_and_store_review(user_id: str, week_start: str | None = None) -> dict:
    """Build and upsert the weekly review for a user."""
    review = await build_weekly_review(user_id, week_start)
    payload = weekly_review_to_dict(review)
    col = get_collection("weekly_reviews")
    uid = ObjectId(user_id)
    now = dt.datetime.now(dt.timezone.utc)
    await col.update_one(
        {"user_id": uid, "week_start": review.week_start},
        {"$set": {**payload, "user_id": uid}, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    stored = await get_review_for_week(user_id, review.week_start)
    return stored or payload


async def get_current_weekly_review(user_id: str, *, allow_generate: bool = True) -> dict | None:
    """Return the current week's review, optionally generating when missing."""
    review = await build_weekly_review(user_id)
    week_start = review.week_start
    stored = await get_review_for_week(user_id, week_start)
    if stored or not allow_generate:
        return stored
    return await generate_and_store_review(user_id, week_start)
