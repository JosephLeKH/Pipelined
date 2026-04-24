"""SEO endpoints: robots.txt and sitemap.xml."""

import asyncio
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter
from fastapi.responses import PlainTextResponse, Response
from pymongo.errors import PyMongoError

from config import settings
from database import get_collection

logger = structlog.get_logger()

router = APIRouter(tags=["seo"])

ROBOTS_DISALLOW_PATHS = [
    "/dashboard",
    "/settings",
    "/calendar",
    "/analytics",
    "/activity",
]

SITEMAP_PRIORITIES = {
    "landing": "1.0",
    "jobs": "0.8",
    "pipeline": "0.5",
    "auth": "0.3",
}


def _build_robots_txt(base_url: str) -> str:
    """Build robots.txt content."""
    lines = ["User-agent: *", "Allow: /"]
    for path in ROBOTS_DISALLOW_PATHS:
        lines.append(f"Disallow: {path}")
    lines.append(f"Sitemap: {base_url}/sitemap.xml")
    return "\n".join(lines)


async def _get_latest_job_lastmod() -> str:
    """Return ISO date of the most recently ingested job, or today."""
    try:
        jobs = get_collection("job_listings")
        doc = await jobs.find_one({}, sort=[("ingested_at", -1)], projection={"ingested_at": 1})
        if doc and doc.get("ingested_at"):
            return doc["ingested_at"].strftime("%Y-%m-%d")
    except PyMongoError:
        logger.error("sitemap_job_lastmod_failed", exc_info=True)
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def _get_active_share_slugs() -> list[str]:
    """Return slugs of all active, non-expired public shares."""
    try:
        shares = get_collection("shares")
        now = datetime.now(timezone.utc)
        cursor = shares.find(
            {"is_active": True, "expires_at": {"$gt": now}},
            projection={"slug": 1},
        )
        return [doc["slug"] async for doc in cursor]
    except PyMongoError:
        logger.error("sitemap_share_slugs_failed", exc_info=True)
        return []


def _build_sitemap_url(loc: str, lastmod: str, priority: str) -> str:
    return (
        f"  <url>\n"
        f"    <loc>{loc}</loc>\n"
        f"    <lastmod>{lastmod}</lastmod>\n"
        f"    <priority>{priority}</priority>\n"
        f"  </url>"
    )


async def _build_sitemap_xml(base_url: str) -> str:
    """Build sitemap.xml content with static and dynamic URLs."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    job_lastmod, slugs = await asyncio.gather(
        _get_latest_job_lastmod(),
        _get_active_share_slugs(),
    )

    urls = [
        _build_sitemap_url(f"{base_url}/", today, SITEMAP_PRIORITIES["landing"]),
        _build_sitemap_url(f"{base_url}/login", today, SITEMAP_PRIORITIES["auth"]),
        _build_sitemap_url(f"{base_url}/register", today, SITEMAP_PRIORITIES["auth"]),
        _build_sitemap_url(f"{base_url}/jobs", job_lastmod, SITEMAP_PRIORITIES["jobs"]),
    ]
    for slug in slugs:
        urls.append(
            _build_sitemap_url(
                f"{base_url}/pipeline/{slug}", today, SITEMAP_PRIORITIES["pipeline"]
            )
        )

    entries = "\n".join(urls)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{entries}\n"
        "</urlset>"
    )


@router.get("/robots.txt", response_class=PlainTextResponse)
async def robots_txt() -> str:
    """Return robots.txt allowing public pages, blocking authenticated pages."""
    base_url = settings.frontend_url.rstrip("/")
    return _build_robots_txt(base_url)


@router.get("/sitemap.xml")
async def sitemap_xml() -> Response:
    """Return XML sitemap with static pages and active public pipeline shares."""
    base_url = settings.frontend_url.rstrip("/")
    content = await _build_sitemap_xml(base_url)
    return Response(content=content, media_type="application/xml")
