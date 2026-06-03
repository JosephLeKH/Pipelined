"""Service: orchestrates URL search + page fetch + LLM JD extraction.

Returns a preview to the router; never persists. The frontend confirms
before any PATCH happens, in line with the "suggest-only" product policy.
"""

import structlog
from bson import ObjectId

from config import settings
from database import get_collection

from .schemas import JobFinderResult
from .tools import extract_job_description, fetch_page_text, find_job_url

logger = structlog.get_logger()


class ApplicationNotFoundError(Exception):
    """Raised when the requested application does not belong to the user."""


class JobFinderError(Exception):
    """Raised when neither an existing URL nor a search hit yields a usable page."""


async def _get_application(app_id: str, user_id: str) -> dict:
    try:
        oid = ObjectId(app_id)
        uid = ObjectId(user_id)
    except Exception as exc:
        raise ApplicationNotFoundError("Invalid id format") from exc

    doc = await get_collection("applications").find_one({"_id": oid, "user_id": uid})
    if not doc:
        raise ApplicationNotFoundError("Application not found")
    return doc


def _result_from_extraction(
    url: str,
    extraction: dict,
    source: str,
    query: str | None,
) -> JobFinderResult:
    jd = extraction.get("job_description", "") or None
    is_valid = bool(extraction.get("is_valid_job_page"))
    confidence = extraction.get("company_match_confidence", "low")
    if confidence not in {"high", "medium", "low"}:
        confidence = "low"
    return JobFinderResult(
        source_url=url,
        job_description=jd,
        is_valid_job_page=is_valid,
        company_match_confidence=confidence,
        source=source,
        search_query=query,
    )


async def find_job_description(user_id: str, app_id: str) -> JobFinderResult:
    """Find a URL (if missing) and scrape a cleaned job description for the application.

    Order of operations:
      1. If the application already has a source_url, skip the search and scrape that.
      2. Otherwise, Exa-search for the role+company and pick a plausible URL.
      3. Fetch the page, ask the LLM to extract the JD from the raw text.
      4. Return the preview; the frontend persists via the existing PATCH.
    """
    app_doc = await _get_application(app_id, user_id)
    company = app_doc.get("company", "")
    role = app_doc.get("role_title", app_doc.get("position", ""))
    location = app_doc.get("location")

    if not company or not role:
        raise JobFinderError("Application is missing company or role")

    existing_url = app_doc.get("source_url")
    if existing_url:
        raw = await fetch_page_text(existing_url)
        extraction = await extract_job_description(company, role, existing_url, raw)
        return _result_from_extraction(existing_url, extraction, source="existing_url", query=None)

    url, query = await find_job_url(company, role, location, settings.exa_api_key)
    if not url:
        return JobFinderResult(
            source_url=None,
            job_description=None,
            is_valid_job_page=False,
            company_match_confidence="low",
            source="fallback",
            search_query=query or None,
        )

    raw = await fetch_page_text(url)
    extraction = await extract_job_description(company, role, url, raw)
    return _result_from_extraction(url, extraction, source="search", query=query)
