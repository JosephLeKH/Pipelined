"""GitHub job sync: fetches and upserts listings from configured repos."""

import asyncio
import base64
import hashlib
import json
import re
from datetime import datetime, timedelta, timezone

import httpx
import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from config import settings
from database import get_collection

logger = structlog.get_logger()

STALE_LISTING_DAYS: int = 60
README_PATH: str = "README.md"
GITHUB_API_BASE: str = "https://api.github.com"

_LINK_NEXT_RE: re.Pattern = re.compile(r'<([^>]+)>;\s*rel="next"')
_MD_LINK_RE: re.Pattern = re.compile(r'\[([^\]]*)\]\(([^)]+)\)')
_TABLE_SEP_RE: re.Pattern = re.compile(r'^\|[\s|:-]+\|$')


def _parse_next_link(link_header: str) -> str | None:
    """Extract the 'next' URL from a GitHub Link response header."""
    match = _LINK_NEXT_RE.search(link_header)
    return match.group(1) if match else None


async def _get_paginated(client: httpx.AsyncClient, url: str) -> list[dict]:
    """GET url following Link rel=next pagination; returns all results combined."""
    results: list[dict] = []
    current_url: str | None = url
    while current_url:
        resp = await client.get(current_url)
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, list):
            results.extend(data)
        else:
            return [data]
        link_header = resp.headers.get("link", "")
        current_url = _parse_next_link(link_header) if link_header else None
    return results


async def _fetch_readme_content(client: httpx.AsyncClient, repo: str) -> str:
    """Fetch and base64-decode the README.md content for a GitHub repo."""
    url = f"{GITHUB_API_BASE}/repos/{repo}/contents/{README_PATH}"
    pages = await _get_paginated(client, url)
    data = pages[0] if pages else {}
    content_b64: str = data.get("content", "")
    decoded = base64.b64decode(content_b64.replace("\n", ""))
    return decoded.decode("utf-8", errors="replace")


def _extract_md_url(text: str) -> str | None:
    """Return the URL from the first markdown link `[label](url)` in text."""
    match = _MD_LINK_RE.search(text)
    return match.group(2) if match else None


def _strip_md_links(text: str) -> str:
    """Replace markdown links with their display text."""
    return _MD_LINK_RE.sub(lambda m: m.group(1), text).strip()


def parse_internship_table(content: str) -> list[dict]:
    """Parse a SimplifyJobs-style README markdown table into listing dicts.

    Extracts company, role, location, and apply_url from each row.
    Skips locked (🔒) and continuation (↳) rows.
    """
    listings: list[dict] = []
    headers: list[str] = []
    past_separator = False

    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line.startswith("|"):
            if past_separator:
                break
            continue

        cells = [c.strip() for c in line.strip("|").split("|")]

        if _TABLE_SEP_RE.match(line):
            past_separator = True
            continue

        if not past_separator:
            headers = [h.lower().strip() for h in cells]
            continue

        if not cells or not cells[0] or cells[0].startswith("↳"):
            continue

        row = dict(zip(headers, cells))
        company = _strip_md_links(row.get("company", ""))
        role = _strip_md_links(row.get("role", ""))
        location = _strip_md_links(row.get("location", ""))

        apply_cell = row.get("application/link", row.get("apply", ""))
        if not apply_cell or "\U0001f512" in apply_cell:
            continue

        apply_url = _extract_md_url(apply_cell)
        if not apply_url:
            continue

        listings.append({
            "company": company,
            "role": role,
            "location": location,
            "apply_url": apply_url,
        })

    return listings


def compute_url_hash(apply_url: str) -> str:
    """Return the SHA-256 hex digest of the lowercase-stripped apply_url."""
    normalized = apply_url.lower().strip()
    return hashlib.sha256(normalized.encode()).hexdigest()


async def _upsert_listing(col, listing: dict) -> None:
    """Upsert a listing by url_hash; sets ingested_at and date_posted on first insert."""
    now = datetime.now(timezone.utc)
    url_hash = compute_url_hash(listing["apply_url"])
    await col.update_one(
        {"url_hash": url_hash},
        {
            "$set": {
                "company": listing["company"],
                "role": listing["role"],
                "location": listing["location"],
                "apply_url": listing["apply_url"],
                "url_hash": url_hash,
                "is_stale": False,
            },
            "$setOnInsert": {
                "ingested_at": now,
                "date_posted": now,
            },
        },
        upsert=True,
    )


async def _mark_stale_listings(col) -> None:
    """Set is_stale=True on listings whose date_posted is older than STALE_LISTING_DAYS."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=STALE_LISTING_DAYS)
    result = await col.update_many(
        {"date_posted": {"$lt": cutoff}, "is_stale": False},
        {"$set": {"is_stale": True}},
    )
    if result.modified_count:
        logger.info("stale_listings_marked", count=result.modified_count)


async def _sync_repo(client: httpx.AsyncClient, repo: str, col) -> None:
    """Fetch README for one repo and upsert all parsed listings."""
    try:
        content = await _fetch_readme_content(client, repo)
        listings = parse_internship_table(content)
        logger.info("repo_parsed", repo=repo, listing_count=len(listings))
        for listing in listings:
            await _upsert_listing(col, listing)
    except (httpx.HTTPError, json.JSONDecodeError, KeyError):
        logger.exception("repo_sync_failed", repo=repo)


async def sync_github_repos() -> None:
    """Scheduled job: ingest listings from all configured GitHub repos."""
    logger.info("github_sync_started")
    col = get_collection("job_listings")

    auth_headers: dict[str, str] = {}
    if settings.github_token:
        auth_headers["Authorization"] = f"token {settings.github_token}"

    async with httpx.AsyncClient(headers=auth_headers, timeout=30.0) as client:
        await asyncio.gather(
            *[_sync_repo(client, repo, col) for repo in settings.github_repos]
        )

    await _mark_stale_listings(col)
    from saved_searches.service import update_match_counts_after_sync  # noqa: PLC0415
    await update_match_counts_after_sync()
    logger.info("github_sync_completed")


DIGEST_SEND_HOUR_UTC: int = 8
DIGEST_SEND_DAY_OF_WEEK: str = "mon"
PURGE_DELETED_HOUR_UTC: int = 4
NOTIFICATION_GEN_MINUTE: int = 0


def create_scheduler() -> AsyncIOScheduler:
    """Build an AsyncIOScheduler with GitHub sync, weekly digest, purge, and notification jobs."""
    from applications.service import purge_stale_deleted_applications  # noqa: PLC0415
    from notifications.digest import send_all_digests  # noqa: PLC0415 — avoid circular at module level
    from notifications.notification_service import generate_notifications  # noqa: PLC0415

    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        sync_github_repos,
        trigger=CronTrigger(hour=settings.github_sync_hour_utc, timezone="UTC"),
        id="github_sync",
        replace_existing=True,
    )
    scheduler.add_job(
        send_all_digests,
        trigger=CronTrigger(day_of_week=DIGEST_SEND_DAY_OF_WEEK, hour=DIGEST_SEND_HOUR_UTC, timezone="UTC"),
        id="weekly_digest",
        replace_existing=True,
    )
    scheduler.add_job(
        purge_stale_deleted_applications,
        trigger=CronTrigger(hour=PURGE_DELETED_HOUR_UTC, timezone="UTC"),
        id="purge_deleted",
        replace_existing=True,
    )
    scheduler.add_job(
        generate_notifications,
        trigger=CronTrigger(minute=NOTIFICATION_GEN_MINUTE, timezone="UTC"),
        id="generate_notifications",
        replace_existing=True,
    )
    return scheduler
