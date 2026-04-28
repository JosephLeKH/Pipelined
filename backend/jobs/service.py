"""Job listings query and retrieval logic."""

from bson import ObjectId
from bson.errors import InvalidId
from motor.motor_asyncio import AsyncIOMotorCollection

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


APPLIED_URLS_LIMIT = 5000

async def _get_applied_urls(user_id: str) -> list[str]:
    """Return list of apply URLs the user has already applied to."""
    apps = get_collection("applications")
    docs = await apps.find(
        {"user_id": ObjectId(user_id), "source_url": {"$ne": None}},
        projection={"source_url": 1, "_id": 0},
    ).to_list(length=APPLIED_URLS_LIMIT)
    if len(docs) == APPLIED_URLS_LIMIT:
        logger.warning("applied_urls_truncated", user_id=user_id, limit=APPLIED_URLS_LIMIT)
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
    col: AsyncIOMotorCollection, mongo_filter: dict, skip: int, limit: int, text_search: bool
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


MAX_RECOMMENDATIONS = 8
CANDIDATE_POOL_LIMIT = 200
SCORE_SAVED_SEARCH_MATCH = 50
SCORE_OFFER_PATTERN_MATCH = 30
SCORE_ATTRIBUTE_MATCH = 20


def _score_job(
    doc: dict,
    search_terms: list[str],
    search_filters: list[dict],
    offer_remotes: set[str],
    offer_company_types: set[str],
) -> tuple[int, str]:
    """Return (score, reason) for a single job doc."""
    score = 0
    reasons: list[str] = []
    role = (doc.get("role") or "").lower()
    company = (doc.get("company") or "").lower()

    for term in search_terms:
        if term and (term in role or term in company):
            score += SCORE_SAVED_SEARCH_MATCH
            reasons.append(f'matches your search "{term}"')
            break

    for sf in search_filters:
        remote = sf.get("remote_status")
        company_type = sf.get("company_type")
        if remote and doc.get("remote_status") == remote:
            score += SCORE_SAVED_SEARCH_MATCH
            reasons.append(f"{remote} role")
            break
        if company_type and doc.get("company_type") == company_type:
            score += SCORE_SAVED_SEARCH_MATCH
            reasons.append(f"{company_type} company")
            break

    if doc.get("remote_status") in offer_remotes:
        score += SCORE_OFFER_PATTERN_MATCH
        reasons.append("similar to your offers")
    if doc.get("company_type") in offer_company_types:
        score += SCORE_ATTRIBUTE_MATCH

    return score, reasons[0] if reasons else "relevant to your profile"


async def get_recommended_listings(user_id: str) -> list[dict]:
    """Return up to MAX_RECOMMENDATIONS scored job docs for the user."""
    import asyncio
    from saved_searches.service import list_saved_searches  # noqa: PLC0415

    col = get_collection("job_listings")
    apps_col = get_collection("applications")
    uid_obj = ObjectId(user_id)

    saved_searches_coro = list_saved_searches(user_id)
    offer_apps_coro = apps_col.find(
        {"user_id": uid_obj, "stage": "offer"},
        projection={"remote_status": 1, "company_type": 1, "_id": 0},
    ).to_list(length=50)
    saved_searches, offer_apps = await asyncio.gather(saved_searches_coro, offer_apps_coro)

    search_terms: list[str] = [
        (s.get("query") or "").lower() for s in saved_searches if s.get("query")
    ]
    search_filters: list[dict] = [s.get("filters", {}) for s in saved_searches]
    offer_remotes: set[str] = {a["remote_status"] for a in offer_apps if a.get("remote_status")}
    offer_company_types: set[str] = {a["company_type"] for a in offer_apps if a.get("company_type")}

    candidate_filter: dict = {"is_stale": {"$ne": True}}
    candidates = await col.find(candidate_filter).sort("ingested_at", -1).limit(CANDIDATE_POOL_LIMIT).to_list(length=CANDIDATE_POOL_LIMIT)

    scored: list[tuple[int, str, dict]] = []
    for doc in candidates:
        score, reason = _score_job(doc, search_terms, search_filters, offer_remotes, offer_company_types)
        scored.append((score, reason, doc))

    scored.sort(key=lambda t: t[0], reverse=True)
    result = []
    for score, reason, doc in scored[:MAX_RECOMMENDATIONS]:
        doc["_recommendation_score"] = score
        doc["_recommendation_reason"] = reason
        result.append(doc)
    return result


async def get_listing(listing_id: str) -> dict | None:
    """Return a single job listing doc by id, or None if not found."""
    col = get_collection("job_listings")
    try:
        oid = ObjectId(listing_id)
    except (ValueError, TypeError, InvalidId):
        return None
    return await col.find_one({"_id": oid})
