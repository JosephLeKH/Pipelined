"""LLM job-listing match scorer for autopilot."""

import re

import httpx
import structlog

from ai.openrouter_client import OpenRouterError, complete_json_with_usage
from autopilot.constants import (
    DESCRIPTION_FETCH_TIMEOUT_SECONDS,
    DESCRIPTION_SNIPPET_MAX_CHARS,
    HTML_TAG_RE,
    MATCH_SCORE_TIMEOUT_SECONDS,
)
from config import settings
from database import get_collection
from parsing.ai_cache import (
    PROVIDER_OPENROUTER,
    QuotaExceededError,
    check_and_increment_quota,
    check_budget,
    compute_cache_key,
    get_cached_response,
    store_response,
)

logger = structlog.get_logger()

MATCH_SCORE_SYSTEM_PROMPT = (
    "You evaluate job fit for a candidate. "
    "Return ONLY valid JSON with keys: "
    "score (integer 0-100), "
    "reason (string, ONE sentence, <=20 words, addressed to the candidate in "
    "second person — e.g. \"Your iOS work at Apple matches their mobile team "
    "focus\"). "
    "Do NOT use third person (\"the candidate\", \"this applicant\"). "
    "The reason must cite a specific detail from the resume that maps to a "
    "specific requirement in the role. "
    "Score based on resume alignment with role requirements."
)


def _validate_match_score(data: dict) -> dict | None:
    try:
        score = int(data["score"])
    except (KeyError, TypeError, ValueError):
        return None
    if not (0 <= score <= 100):
        return None
    return {"score": score, "reason": str(data.get("reason", ""))}


def _strip_html(text: str) -> str:
    cleaned = re.sub(HTML_TAG_RE, " ", text)
    return re.sub(r"\s+", " ", cleaned).strip()


async def _fetch_description_snippet(apply_url: str) -> str:
    """Fetch apply_url HTML and return a plain-text snippet."""
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=DESCRIPTION_FETCH_TIMEOUT_SECONDS,
        ) as client:
            response = await client.get(apply_url)
            response.raise_for_status()
            snippet = _strip_html(response.text)[:DESCRIPTION_SNIPPET_MAX_CHARS]
            return snippet
    except httpx.HTTPError as exc:
        logger.warning("description_fetch_failed", apply_url=apply_url, error=str(exc))
        return ""


async def ensure_listing_description(listing: dict) -> str:
    """Return description text, fetching and caching description_snippet when missing."""
    snippet = listing.get("description_snippet") or listing.get("description") or ""
    if snippet:
        return snippet

    apply_url = listing.get("apply_url")
    if not apply_url:
        return ""

    fetched = await _fetch_description_snippet(apply_url)
    if fetched and listing.get("_id"):
        await get_collection("job_listings").update_one(
            {"_id": listing["_id"]},
            {"$set": {"description_snippet": fetched}},
        )
        listing["description_snippet"] = fetched
    return fetched


def _build_match_prompt(user_doc: dict, listing: dict, description: str) -> str:
    resume = (user_doc.get("resume_text") or "")[:800]
    role = listing.get("role") or "Unknown role"
    company = listing.get("company") or "Unknown company"
    location = listing.get("location") or ""
    desc_block = description[:1200] if description else "No job description available."
    return (
        f"Role: {role} at {company}\n"
        f"Location: {location}\n"
        f"Job description:\n{desc_block}\n\n"
        f"Candidate resume:\n{resume or 'No resume on file.'}"
    )


async def score_listing_for_user(
    user_id: str, user_doc: dict, listing: dict
) -> dict | None:
    """Score a listing for a user via OpenRouter. Returns {score, reason} or None."""
    if not settings.openrouter_api_key:
        return None

    description = await ensure_listing_description(listing)
    user_msg = _build_match_prompt(user_doc, listing, description)
    model = settings.openrouter_default_model
    cache_key = compute_cache_key(model, user_msg[:500], PROVIDER_OPENROUTER)

    cached = await get_cached_response(cache_key)
    if cached is not None:
        return cached

    if not await check_budget(PROVIDER_OPENROUTER):
        return None

    try:
        await check_and_increment_quota(user_id, PROVIDER_OPENROUTER)
    except QuotaExceededError:
        logger.warning("autopilot_match_quota_exceeded", user_id=user_id)
        return None

    try:
        data, input_tokens, output_tokens = await complete_json_with_usage(
            MATCH_SCORE_SYSTEM_PROMPT,
            user_msg,
            temperature=0.3,
            max_tokens=150,
            timeout=MATCH_SCORE_TIMEOUT_SECONDS,
        )
        result = _validate_match_score(data)
    except OpenRouterError:
        return None

    if result is not None:
        await store_response(
            cache_key, result, model, input_tokens, output_tokens, PROVIDER_OPENROUTER
        )
    return result
