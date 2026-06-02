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

    total, docs = await _fetch_listings_and_count(
        col, mongo_filter, skip, query.per_page, bool(query.q), query.sort
    )
    logger.info("job_listings_fetched", total=total, page=query.page, sort=query.sort)
    return docs, total


async def _fetch_listings_and_count(
    col: AsyncIOMotorCollection,
    mongo_filter: dict,
    skip: int,
    limit: int,
    text_search: bool,
    sort: str | None,
) -> tuple[int, list[dict]]:
    """Run count and paginated find in parallel.

    Sort precedence: explicit `sort` (newest/oldest) overrides text score so users
    who pick a sort always get a date-ordered, paginatable result. Newest/oldest
    use `date_posted` (the date shown on the card) so the visible order matches the
    user's selection, with `ingested_at` as tiebreaker. With no explicit sort and a
    text query, results rank by text score; otherwise newest posted first.
    """
    import asyncio

    use_text_score = text_search and sort is None
    projection = {"score": {"$meta": "textScore"}} if use_text_score else None

    find_cursor = col.find(mongo_filter, projection) if projection else col.find(mongo_filter)
    if use_text_score:
        sort_spec: list | str = [("score", {"$meta": "textScore"})]
    elif sort == "oldest":
        sort_spec = [("date_posted", 1), ("ingested_at", 1)]
    else:
        sort_spec = [("date_posted", -1), ("ingested_at", -1)]

    total_coro = col.count_documents(mongo_filter)
    docs_coro = find_cursor.sort(sort_spec).skip(skip).limit(limit).to_list(length=limit)
    total, docs = await asyncio.gather(total_coro, docs_coro)
    return total, docs


MAX_RECOMMENDATIONS = 8
CANDIDATE_POOL_LIMIT = 200
SCORE_SAVED_SEARCH_MATCH = 50
SCORE_OFFER_PATTERN_MATCH = 30
SCORE_ATTRIBUTE_MATCH = 20
SCORE_ROLE_KEYWORD_MATCH = 25

ROLE_KEYWORD_STOPWORDS = {"with", "and", "the", "for", "senior", "junior", "lead", "staff"}


async def _get_user_role_keywords(user_id: str) -> set[str]:
    """Extract keywords from user's recent applications for role matching."""
    try:
        apps = get_collection("applications")
        docs = await apps.find(
            {"user_id": ObjectId(user_id)},
            projection={"role_title": 1, "_id": 0},
        ).sort("date_applied", -1).limit(20).to_list(length=20)

        keywords: set[str] = set()
        for doc in docs:
            role_title = (doc.get("role_title") or "").lower()
            if not role_title:
                continue
            # Split by whitespace and special characters, filter by length and stopwords
            words = [w for w in role_title.replace("-", " ").split() if len(w) >= 4 and w not in ROLE_KEYWORD_STOPWORDS]
            keywords.update(words)

        return keywords
    except Exception:
        logger.warning("role_keywords_extraction_failed", user_id=user_id)
        return set()


def _score_job(
    doc: dict,
    search_terms: list[str],
    search_filters: list[dict],
    offer_remotes: set[str],
    offer_company_types: set[str],
    user_keywords: set[str],
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

    # Check if any user keywords appear in the job role title
    job_role = (doc.get("role") or "").lower()
    for keyword in user_keywords:
        if keyword in job_role:
            score += SCORE_ROLE_KEYWORD_MATCH
            reasons.append("role match")
            break

    return score, reasons[0] if reasons else "relevant to your profile"


async def get_recommended_listings(user_id: str) -> list[dict]:
    """Return up to MAX_RECOMMENDATIONS scored job docs for the user."""
    import asyncio
    from saved_searches.service import list_saved_searches  # noqa: PLC0415

    col = get_collection("job_listings")
    apps_col = get_collection("applications")
    uid_obj = ObjectId(user_id)

    from applications.service_constants import OFFER_STAGE  # noqa: PLC0415

    saved_searches_coro = list_saved_searches(user_id)
    offer_apps_coro = apps_col.find(
        {"user_id": uid_obj, "current_stage": OFFER_STAGE},
        projection={"remote_status": 1, "company_type": 1, "_id": 0},
    ).to_list(length=50)
    keywords_coro = _get_user_role_keywords(user_id)
    saved_searches, offer_apps, user_keywords = await asyncio.gather(saved_searches_coro, offer_apps_coro, keywords_coro)

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
        score, reason = _score_job(doc, search_terms, search_filters, offer_remotes, offer_company_types, user_keywords)
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
