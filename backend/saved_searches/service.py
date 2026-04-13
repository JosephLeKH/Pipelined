"""Business logic for saved searches: CRUD, result execution, and match counting."""

import asyncio
from datetime import datetime, timezone

import structlog
from bson import ObjectId
from bson.errors import InvalidId

from database import get_collection
from saved_searches.schemas import SavedSearchCreate

logger = structlog.get_logger()

MAX_SAVED_SEARCHES_PER_USER: int = 10
RESULTS_PAGE_SIZE: int = 50


class SavedSearchLimitError(Exception):
    """Raised when a user exceeds the maximum saved search count."""


class SavedSearchNotFoundError(Exception):
    """Raised when a saved search is not found or does not belong to the user."""


async def create_saved_search(user_id: str, body: SavedSearchCreate) -> dict:
    """Insert a new saved search and return the full doc. Raises SavedSearchLimitError if at limit."""
    col = get_collection("saved_searches")
    uid = ObjectId(user_id)
    count = await col.count_documents({"user_id": uid})
    if count >= MAX_SAVED_SEARCHES_PER_USER:
        raise SavedSearchLimitError()
    now = datetime.now(timezone.utc)
    doc = {
        "user_id": uid,
        "name": body.name,
        "query": body.query,
        "filters": body.filters.model_dump(exclude_none=True),
        "last_checked_at": None,
        "new_matches_count": 0,
        "created_at": now,
    }
    result = await col.insert_one(doc)
    doc["_id"] = result.inserted_id
    logger.info("saved_search_created", user_id=user_id, name=body.name)
    return doc


async def list_saved_searches(user_id: str) -> list[dict]:
    """Return all saved searches for a user, newest first."""
    col = get_collection("saved_searches")
    uid = ObjectId(user_id)
    return await col.find({"user_id": uid}).sort("created_at", -1).to_list(length=None)


async def delete_saved_search(user_id: str, search_id: str) -> None:
    """Delete a saved search. Raises SavedSearchNotFoundError if not found."""
    col = get_collection("saved_searches")
    uid = ObjectId(user_id)
    try:
        oid = ObjectId(search_id)
    except (ValueError, TypeError, InvalidId):
        raise SavedSearchNotFoundError()
    result = await col.delete_one({"_id": oid, "user_id": uid})
    if result.deleted_count == 0:
        raise SavedSearchNotFoundError()


def _build_jobs_filter(search: dict) -> dict:
    """Build a MongoDB job_listings filter from a saved search document."""
    from jobs.service import _build_filter  # noqa: PLC0415
    from jobs.schemas import JobListQuery  # noqa: PLC0415

    filters = search.get("filters", {})
    jq = JobListQuery(
        q=search.get("query") or None,
        role_type=filters.get("role_type"),
        experience_level=filters.get("experience_level"),
        remote_status=filters.get("remote_status"),
        company_type=filters.get("company_type"),
        salary_min=filters.get("min_salary"),
    )
    return _build_filter(jq, [])


async def get_saved_search_results(
    user_id: str, search_id: str
) -> tuple[dict, list[dict], int]:
    """Run the saved search against job_listings, reset match count, return (search, docs, total)."""
    col = get_collection("saved_searches")
    uid = ObjectId(user_id)
    try:
        oid = ObjectId(search_id)
    except (ValueError, TypeError, InvalidId):
        raise SavedSearchNotFoundError()

    search = await col.find_one({"_id": oid, "user_id": uid})
    if not search:
        raise SavedSearchNotFoundError()

    jobs_col = get_collection("job_listings")
    mongo_filter = _build_jobs_filter(search)
    now = datetime.now(timezone.utc)

    total_coro = jobs_col.count_documents(mongo_filter)
    docs_coro = (
        jobs_col.find(mongo_filter)
        .sort("ingested_at", -1)
        .limit(RESULTS_PAGE_SIZE)
        .to_list(length=RESULTS_PAGE_SIZE)
    )
    total, docs = await asyncio.gather(total_coro, docs_coro)

    await col.update_one(
        {"_id": oid},
        {"$set": {"new_matches_count": 0, "last_checked_at": now}},
    )
    search["new_matches_count"] = 0
    search["last_checked_at"] = now
    logger.info("saved_search_results_fetched", search_id=search_id, total=total)
    return search, docs, total


async def update_match_counts_after_sync() -> None:
    """After a GitHub sync, increment new_matches_count for each saved search that has new matches."""
    col = get_collection("saved_searches")
    jobs_col = get_collection("job_listings")
    from notifications.notification_service import create_notification  # noqa: PLC0415

    searches = await col.find({}).to_list(length=None)
    if not searches:
        return

    for search in searches:
        try:
            await _update_single_search_count(search, col, jobs_col, create_notification)
        except (TypeError, KeyError, asyncio.TimeoutError):
            logger.exception("saved_search_count_update_failed", search_id=str(search["_id"]))


async def _update_single_search_count(
    search: dict,
    col,
    jobs_col,
    create_notification_fn,
) -> None:
    """Count new listings since last_checked_at and increment new_matches_count."""
    mongo_filter = _build_jobs_filter(search)
    last_checked = search.get("last_checked_at")
    if last_checked:
        mongo_filter["ingested_at"] = {"$gt": last_checked}

    new_count = await jobs_col.count_documents(mongo_filter)
    if new_count == 0:
        return

    result = await col.find_one_and_update(
        {"_id": search["_id"]},
        {"$inc": {"new_matches_count": new_count}},
        return_document=True,
    )
    updated_count = result.get("new_matches_count", new_count) if result else new_count

    if updated_count > 0:
        await create_notification_fn(
            user_id=search["user_id"],
            type="saved_search_match",
            title="New job matches",
            body=f'{new_count} new job{"s" if new_count != 1 else ""} match your saved search "{search["name"]}"',
            action_url="/jobs",
        )
    logger.info(
        "saved_search_count_updated",
        search_id=str(search["_id"]),
        new_count=new_count,
    )
