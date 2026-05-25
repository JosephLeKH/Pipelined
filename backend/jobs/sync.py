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
from apscheduler.triggers.interval import IntervalTrigger

from config import settings
from database import get_collection
from motor.motor_asyncio import AsyncIOMotorCollection

logger = structlog.get_logger()

STALE_LISTING_DAYS: int = 60
README_PATH: str = "README.md"
GITHUB_API_BASE: str = "https://api.github.com"

_LINK_NEXT_RE: re.Pattern = re.compile(r'<([^>]+)>;\s*rel="next"')
_MD_LINK_RE: re.Pattern = re.compile(r'\[([^\]]*)\]\(([^)]+)\)')
_HTML_HREF_RE: re.Pattern = re.compile(r'<a[^>]+href=["\']([^"\']+)["\']', re.IGNORECASE)
_TABLE_SEP_RE: re.Pattern = re.compile(r'^\|[\s|:-]+\|$')
_DETAILS_RE: re.Pattern = re.compile(r'<details[^>]*>.*?<summary[^>]*>.*?</summary>(.*?)</details>', re.IGNORECASE | re.DOTALL)
_BR_RE: re.Pattern = re.compile(r'</?br\s*/?>', re.IGNORECASE)
_HTML_TAG_RE: re.Pattern = re.compile(r'<[^>]+>')


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


def _parse_repo_spec(spec: str) -> tuple[str, str, str | None]:
    """Parse 'owner/repo[@ref][:path]' into (repo, path, ref).

    Examples:
      'SimplifyJobs/New-Grad-Positions'                   -> ('SimplifyJobs/New-Grad-Positions', 'README.md', None)
      'vanshb03/Summer2027-Internships@dev'               -> ('vanshb03/Summer2027-Internships', 'README.md', 'dev')
      'vanshb03/Summer2027-Internships@dev:OFFSEASON_README.md'
    """
    rest, _, path = spec.partition(":")
    repo, _, ref = rest.partition("@")
    return repo, path or README_PATH, ref or None


async def _fetch_readme_content(client: httpx.AsyncClient, spec: str) -> str:
    """Fetch and base64-decode README content for a repo spec (see _parse_repo_spec)."""
    repo, path, ref = _parse_repo_spec(spec)
    url = f"{GITHUB_API_BASE}/repos/{repo}/contents/{path}"
    if ref:
        url = f"{url}?ref={ref}"
    pages = await _get_paginated(client, url)
    data = pages[0] if pages else {}
    content_b64: str = data.get("content", "")
    decoded = base64.b64decode(content_b64.replace("\n", ""))
    return decoded.decode("utf-8", errors="replace")


def _extract_md_url(text: str) -> str | None:
    """Return the first URL in text, supporting `[label](url)` or `<a href="url">`.

    SimplifyJobs-style READMEs use markdown links; vanshb03-style READMEs render
    Apply badges as HTML anchors. We accept either.
    """
    md = _MD_LINK_RE.search(text)
    if md:
        return md.group(2)
    html = _HTML_HREF_RE.search(text)
    return html.group(1) if html else None


def _strip_md_links(text: str) -> str:
    """Replace markdown links with their display text and strip bold/italic markers."""
    stripped = _MD_LINK_RE.sub(lambda m: m.group(1), text)
    stripped = stripped.replace("**", "").replace("__", "")
    return stripped.strip()


def _clean_location(text: str) -> str:
    """Flatten <details><summary>N locations</summary>city1</br>city2</details> markup.

    vanshb03 READMEs wrap multi-city rows in a collapsible block; render-mode tables
    show '8 locations' with a foldout. We just want the comma-joined city list.
    """
    detail = _DETAILS_RE.search(text)
    inner = detail.group(1) if detail else text
    parts = [p.strip() for p in _BR_RE.split(inner) if p.strip()]
    cleaned = " · ".join(parts) if parts else inner
    cleaned = _HTML_TAG_RE.sub("", cleaned)
    return _strip_md_links(cleaned)


def _process_table_row(headers: list[str], cells: list[str]) -> dict | None:
    """Extract a listing from table row cells; return None if the row should be skipped."""
    if not cells or not cells[0] or cells[0].startswith("↳"):
        return None

    row = dict(zip(headers, cells))
    company = _strip_md_links(row.get("company", ""))
    role = _strip_md_links(row.get("role", ""))
    location = _clean_location(row.get("location", ""))

    apply_cell = row.get("application/link", row.get("apply", ""))
    if not apply_cell or "\U0001f512" in apply_cell:
        return None

    apply_url = _extract_md_url(apply_cell)
    if not apply_url:
        return None

    return {
        "company": company,
        "role": role,
        "location": location,
        "apply_url": apply_url,
    }


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

        listing = _process_table_row(headers, cells)
        if listing:
            listings.append(listing)

    return listings


def compute_url_hash(apply_url: str) -> str:
    """Return the SHA-256 hex digest of the lowercase-stripped apply_url."""
    normalized = apply_url.lower().strip()
    return hashlib.sha256(normalized.encode()).hexdigest()


async def _upsert_listing(col: AsyncIOMotorCollection, listing: dict) -> None:
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


async def _mark_stale_listings(col: AsyncIOMotorCollection) -> None:
    """Set is_stale=True on listings whose date_posted is older than STALE_LISTING_DAYS."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=STALE_LISTING_DAYS)
    result = await col.update_many(
        {"date_posted": {"$lt": cutoff}, "is_stale": False},
        {"$set": {"is_stale": True}},
    )
    if result.modified_count:
        logger.info("stale_listings_marked", count=result.modified_count)


async def _sync_repo(client: httpx.AsyncClient, repo: str, col: AsyncIOMotorCollection) -> None:
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
MORNING_BRIEF_MINUTE_UTC: int = 15
WEEKLY_REVIEW_MINUTE_UTC: int = 30
STALE_FOLLOWUP_HOUR_UTC: int = 7


async def _stale_followup_job() -> None:
    """Scheduled job: auto-draft follow-ups for all users' stale applications."""
    from applications.service_stale import auto_draft_stale_followups  # noqa: PLC0415
    logger.info("stale_followup_scan_started")
    users_col = get_collection("users")
    total = 0
    async for user in users_col.find({}, {"_id": 1}):
        try:
            count = await auto_draft_stale_followups(str(user["_id"]))
            total += count
        except Exception:
            logger.exception("stale_followup_user_failed", user_id=str(user["_id"]))
    logger.info("stale_followup_scan_completed", total=total)


def create_scheduler() -> AsyncIOScheduler:
    """Build an AsyncIOScheduler with GitHub sync, weekly digest, purge, and notification jobs."""
    from applications.service_bulk import purge_stale_deleted_applications  # noqa: PLC0415
    from notifications.digest import send_all_digests  # noqa: PLC0415 — avoid circular at module level
    from notifications.notification_service import generate_notifications  # noqa: PLC0415
    from notifications.morning_brief_scheduler import send_due_morning_briefs  # noqa: PLC0415
    from review.weekly_review_scheduler import generate_due_weekly_reviews  # noqa: PLC0415

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
        send_due_morning_briefs,
        trigger=CronTrigger(minute=MORNING_BRIEF_MINUTE_UTC, timezone="UTC"),
        id="morning_brief",
        replace_existing=True,
    )
    scheduler.add_job(
        generate_due_weekly_reviews,
        trigger=CronTrigger(minute=WEEKLY_REVIEW_MINUTE_UTC, timezone="UTC"),
        id="weekly_review",
        replace_existing=True,
    )
    scheduler.add_job(
        generate_notifications,
        trigger=CronTrigger(minute=NOTIFICATION_GEN_MINUTE, timezone="UTC"),
        id="generate_notifications",
        replace_existing=True,
    )

    from email_integration.batch_sync import sync_all_users  # noqa: PLC0415
    from autopilot.scan import autopilot_scan  # noqa: PLC0415
    from autopilot.constants import AUTOPILOT_SCAN_HOUR_UTC  # noqa: PLC0415
    from watchlist.scan import watchlist_scan  # noqa: PLC0415
    from watchlist.constants import WATCHLIST_SCAN_HOUR_UTC  # noqa: PLC0415

    scheduler.add_job(
        sync_all_users,
        trigger=IntervalTrigger(hours=settings.gmail_sync_interval_hours),
        id="gmail_sync",
        replace_existing=True,
    )
    scheduler.add_job(
        autopilot_scan,
        trigger=CronTrigger(hour=AUTOPILOT_SCAN_HOUR_UTC, timezone="UTC"),
        id="autopilot_scan",
        replace_existing=True,
    )
    scheduler.add_job(
        watchlist_scan,
        trigger=CronTrigger(hour=WATCHLIST_SCAN_HOUR_UTC, timezone="UTC"),
        id="watchlist_scan",
        replace_existing=True,
    )
    scheduler.add_job(
        _stale_followup_job,
        trigger=CronTrigger(hour=STALE_FOLLOWUP_HOUR_UTC, timezone="UTC"),
        id="stale_followup",
        replace_existing=True,
    )
    return scheduler
