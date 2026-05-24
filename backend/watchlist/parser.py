"""Parse job listings from company career pages."""

import json
import re
from urllib.parse import urljoin, urlparse

import structlog
from bs4 import BeautifulSoup

logger = structlog.get_logger()

GREENHOUSE_HOST = "boards.greenhouse.io"
LEVER_HOST = "jobs.lever.co"
JOB_LINK_KEYWORDS = ("job", "career", "position", "opening", "apply", "posting")


def _greenhouse_board_slug(url: str) -> str | None:
    parsed = urlparse(url)
    if GREENHOUSE_HOST not in parsed.netloc:
        return None
    parts = [part for part in parsed.path.split("/") if part]
    return parts[0] if parts else None


def _lever_company_slug(url: str) -> str | None:
    parsed = urlparse(url)
    if LEVER_HOST not in parsed.netloc:
        return None
    parts = [part for part in parsed.path.split("/") if part]
    return parts[0] if parts else None


def parse_greenhouse_jobs(payload: list[dict], company: str, board_url: str) -> list[dict]:
    """Parse Greenhouse boards API JSON into listing dicts."""
    listings: list[dict] = []
    for job in payload:
        job_id = job.get("id")
        title = (job.get("title") or "").strip()
        if not job_id or not title:
            continue
        absolute_url = (job.get("absolute_url") or "").strip()
        if not absolute_url:
            absolute_url = urljoin(board_url.rstrip("/") + "/", f"jobs/{job_id}")
        location = ""
        loc_obj = job.get("location") or {}
        if isinstance(loc_obj, dict):
            location = (loc_obj.get("name") or "").strip()
        listings.append({
            "company": company,
            "role": title,
            "location": location,
            "apply_url": absolute_url,
        })
    return listings


def parse_lever_jobs(payload: list[dict], company: str) -> list[dict]:
    """Parse Lever postings API JSON into listing dicts."""
    listings: list[dict] = []
    for job in payload:
        title = (job.get("text") or "").strip()
        apply_url = (job.get("hostedUrl") or job.get("applyUrl") or "").strip()
        if not title or not apply_url:
            continue
        categories = job.get("categories") or {}
        location = (categories.get("location") or "").strip() if isinstance(categories, dict) else ""
        listings.append({
            "company": company,
            "role": title,
            "location": location,
            "apply_url": apply_url,
        })
    return listings


def _looks_like_job_link(href: str, text: str) -> bool:
    combined = f"{href} {text}".lower()
    return any(keyword in combined for keyword in JOB_LINK_KEYWORDS)


def parse_html_listings(html: str, company: str, page_url: str) -> list[dict]:
    """Best-effort extraction of job links from generic career page HTML."""
    soup = BeautifulSoup(html, "html.parser")
    seen_urls: set[str] = set()
    listings: list[dict] = []

    for anchor in soup.find_all("a", href=True):
        href = anchor["href"].strip()
        if not href or href.startswith("#"):
            continue
        text = anchor.get_text(strip=True)
        if not text or len(text) > 120:
            continue
        absolute = urljoin(page_url, href)
        if absolute in seen_urls:
            continue
        if not _looks_like_job_link(absolute, text):
            continue
        seen_urls.add(absolute)
        listings.append({
            "company": company,
            "role": text,
            "location": "",
            "apply_url": absolute,
        })

    return listings


async def fetch_api_listings(
    client,
    careers_url: str,
    company: str,
) -> list[dict] | None:
    """Try known ATS JSON APIs before falling back to HTML parsing."""
    greenhouse_slug = _greenhouse_board_slug(careers_url)
    if greenhouse_slug:
        api_url = f"https://boards-api.greenhouse.io/v1/boards/{greenhouse_slug}/jobs"
        resp = await client.get(api_url)
        resp.raise_for_status()
        payload = resp.json().get("jobs") or []
        return parse_greenhouse_jobs(payload, company, careers_url)

    lever_slug = _lever_company_slug(careers_url)
    if lever_slug:
        api_url = f"https://api.lever.co/v0/postings/{lever_slug}?mode=json"
        resp = await client.get(api_url)
        resp.raise_for_status()
        payload = resp.json()
        if isinstance(payload, list):
            return parse_lever_jobs(payload, company)

    return None


def parse_listings_from_content(content: str, company: str, careers_url: str) -> list[dict]:
    """Parse listings from fetched page content (JSON or HTML)."""
    stripped = content.strip()
    if stripped.startswith("{") or stripped.startswith("["):
        try:
            payload = json.loads(stripped)
        except json.JSONDecodeError:
            logger.warning("watchlist_json_parse_failed", company=company, careers_url=careers_url)
        else:
            if isinstance(payload, list):
                if payload and isinstance(payload[0], dict) and "hostedUrl" in payload[0]:
                    return parse_lever_jobs(payload, company)
                if payload and isinstance(payload[0], dict) and "absolute_url" in payload[0]:
                    return parse_greenhouse_jobs(payload, company, careers_url)

    return parse_html_listings(stripped, company, careers_url)
