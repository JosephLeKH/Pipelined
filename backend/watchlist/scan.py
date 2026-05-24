"""Daily watchlist scan — fetch career pages, upsert listings, queue matches."""

import httpx
import structlog
from auth.schemas import watchlist_companies_from_doc
from auth.url_validation import validate_public_http_url
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection

from database import get_collection
from jobs.sync import compute_url_hash
from watchlist.constants import FETCH_TIMEOUT_SECONDS, USER_AGENT
from watchlist.matcher import queue_watchlist_matches
from watchlist.parser import fetch_api_listings, parse_listings_from_content

logger = structlog.get_logger()


async def _upsert_listing(
    col: AsyncIOMotorCollection,
    listing: dict,
    user_id: ObjectId,
) -> ObjectId | None:
    """Upsert a listing by url_hash; return listing id when newly inserted."""
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    url_hash = compute_url_hash(listing["apply_url"])
    existing = await col.find_one({"url_hash": url_hash}, projection={"_id": 1})
    await col.update_one(
        {"url_hash": url_hash},
        {
            "$set": {
                "company": listing["company"],
                "role": listing["role"],
                "location": listing.get("location") or "",
                "apply_url": listing["apply_url"],
                "url_hash": url_hash,
                "is_stale": False,
                "watchlist_user_id": user_id,
            },
            "$setOnInsert": {
                "ingested_at": now,
                "date_posted": now,
            },
        },
        upsert=True,
    )
    if existing is not None:
        return None
    doc = await col.find_one({"url_hash": url_hash}, projection={"_id": 1})
    return doc["_id"] if doc else None


async def _fetch_company_listings(
    client: httpx.AsyncClient,
    company: dict,
) -> list[dict]:
    """Fetch and parse listings for one watchlist company."""
    name = company["name"]
    careers_url = company["careers_url"]
    try:
        validate_public_http_url(careers_url)
    except ValueError:
        logger.warning("watchlist_blocked_url", company=name, careers_url=careers_url)
        return []
    try:
        api_listings = await fetch_api_listings(client, careers_url, name)
        if api_listings is not None:
            return api_listings
        resp = await client.get(careers_url)
        resp.raise_for_status()
        return parse_listings_from_content(resp.text, name, careers_url)
    except httpx.HTTPError as exc:
        logger.error(
            "watchlist_fetch_failed",
            company=name,
            careers_url=careers_url,
            error=str(exc),
        )
        return []
    except Exception as exc:
        logger.error(
            "watchlist_parse_failed",
            company=name,
            careers_url=careers_url,
            error=str(exc),
        )
        return []


async def _scan_for_user(user_doc: dict, client: httpx.AsyncClient) -> int:
    user_id = user_doc["_id"]
    companies = watchlist_companies_from_doc(user_doc)
    if not companies:
        return 0

    listings_col = get_collection("job_listings")
    new_listing_ids: list[ObjectId] = []
    for company in companies:
        listings = await _fetch_company_listings(client, company)
        logger.info(
            "watchlist_company_parsed",
            user_id=str(user_id),
            company=company["name"],
            listing_count=len(listings),
        )
        for listing in listings:
            listing_id = await _upsert_listing(listings_col, listing, user_id)
            if listing_id is not None:
                new_listing_ids.append(listing_id)

    matches_created = await queue_watchlist_matches(user_doc, new_listing_ids)
    if new_listing_ids:
        logger.info(
            "watchlist_scan_user_complete",
            user_id=str(user_id),
            new_listings=len(new_listing_ids),
            matches_created=matches_created,
        )
    return matches_created


async def watchlist_scan() -> None:
    """Scheduled job: scan watchlist career pages for all users."""
    logger.info("watchlist_scan_started")
    users_col = get_collection("users")
    cursor = users_col.find({"watchlist_companies.0": {"$exists": True}})
    total_matches = 0

    headers = {"User-Agent": USER_AGENT}
    async with httpx.AsyncClient(headers=headers, timeout=FETCH_TIMEOUT_SECONDS, follow_redirects=False) as client:
        async for user_doc in cursor:
            total_matches += await _scan_for_user(user_doc, client)

    logger.info("watchlist_scan_completed", total_matches=total_matches)
