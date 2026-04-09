"""Job listings query and retrieval logic."""

from bson import ObjectId

import structlog

from database import get_collection
from jobs.schemas import JobListQuery

logger = structlog.get_logger()


class JobListingNotFoundError(Exception):
    """Raised when a requested job listing does not exist."""


def _build_filter(query: JobListQuery, excluded_urls: list[str]) -> dict:
    """Build a MongoDB filter from query params."""
    f: dict = {}

    if query.q:
        f["$text"] = {"$search": query.q}
    if query.role_type and query.role_type != "any":
        f["role_type"] = query.role_type
    if query.experience_level and query.experience_level != "any":
        f["experience_level"] = query.experience_level
    if query.company_type:
        f["company_type"] = query.company_type
    if query.remote_status:
        f["remote_status"] = query.remote_status
    if query.date_from:
        f["date_posted"] = {"$gte": query.date_from}
    if query.salary_min is not None or query.salary_max is not None:
        salary_filter: dict = {}
        if query.salary_min is not None:
            salary_filter["$gte"] = query.salary_min
        if query.salary_max is not None:
            salary_filter["$lte"] = query.salary_max
        f["salary_min_value"] = salary_filter
    if excluded_urls:
        f["apply_url"] = {"$nin": excluded_urls}

    return f


async def _get_applied_urls(user_id: str) -> list[str]:
    """Return list of apply URLs the user has already applied to."""
    apps = get_collection("applications")
    docs = await apps.find(
        {"user_id": ObjectId(user_id), "source_url": {"$ne": None}},
        projection={"source_url": 1},
    ).to_list(length=None)
    return [str(d["source_url"]) for d in docs if d.get("source_url")]


async def list_listings(
    query: JobListQuery, user_id: str | None
) -> tuple[list[dict], int]:
    """Return (docs, total_count) for the given page and filters.

    When hide_applied is True and user_id is provided, applied listings are excluded.
    """
    col = get_collection("job_listings")

    excluded_urls: list[str] = []
    if query.hide_applied and user_id:
        excluded_urls = await _get_applied_urls(user_id)

    mongo_filter = _build_filter(query, excluded_urls)
    skip = (query.page - 1) * query.per_page

    total, docs = await _fetch_listings_and_count(col, mongo_filter, skip, query.per_page, bool(query.q))
    logger.info("job_listings_fetched", total=total, page=query.page)
    return docs, total


async def _fetch_listings_and_count(
    col, mongo_filter: dict, skip: int, limit: int, text_search: bool
) -> tuple[int, list[dict]]:
    """Run count and paginated find in parallel."""
    import asyncio

    projection = {"score": {"$meta": "textScore"}} if text_search else None

    total_coro = col.count_documents(mongo_filter)
    find_cursor = col.find(mongo_filter, projection) if projection else col.find(mongo_filter)
    if text_search:
        docs_coro = find_cursor.sort([("score", {"$meta": "textScore"})]).skip(skip).limit(limit).to_list(length=limit)
    else:
        docs_coro = find_cursor.sort("ingested_at", -1).skip(skip).limit(limit).to_list(length=limit)
    total, docs = await asyncio.gather(total_coro, docs_coro)
    return total, docs


async def get_listing(listing_id: str) -> dict | None:
    """Return a single job listing doc by id, or None if not found."""
    col = get_collection("job_listings")
    try:
        oid = ObjectId(listing_id)
    except Exception:
        return None
    return await col.find_one({"_id": oid})
