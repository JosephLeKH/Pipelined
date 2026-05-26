"""Cover letter and resume-tip generation for autopilot opportunities."""

import structlog

from ai.openrouter_client import OpenRouterError, complete_json_with_usage
from autopilot.constants import PREP_GENERATION_MAX_TOKENS, PREP_GENERATION_TIMEOUT_SECONDS
from config import settings
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

PREP_SYSTEM_PROMPT = (
    "You help a job seeker decide whether to apply and prepare materials. "
    "Return ONLY valid JSON with keys:\n"
    "  cover_letter: {subject: string, body: string}\n"
    "  resume_tips: {summary: string (one sentence), "
    "bullet_suggestions: [string] (at most 3, each <=15 words)}\n"
    "  talking_points: [string] — EXACTLY 3 short points (<=18 words each). "
    "Each point MUST cite a specific detail from the candidate's resume "
    "(named project, employer, course, tool, metric) AND map it to a "
    "specific requirement in the job description. Address the candidate "
    "in second person (\"Your X at Y maps to their Z\"). "
    "FORBIDDEN phrases: \"enthusiasm\", \"passion\", \"eagerness\", "
    "\"strong academic background\", \"problem-solving abilities\", "
    "\"willingness to learn\", or any sentence that could apply to every "
    "candidate.\n"
    "Resume tips must be suggest-only — never rewrite the resume directly."
)


def _validate_prep(data: dict) -> dict | None:
    cover = data.get("cover_letter")
    tips = data.get("resume_tips")
    if not isinstance(cover, dict) or not isinstance(tips, dict):
        return None
    subject = str(cover.get("subject", "")).strip()
    body = str(cover.get("body", "")).strip()
    summary = str(tips.get("summary", "")).strip()
    bullets_raw = tips.get("bullet_suggestions", [])
    if not subject or not body or not summary:
        return None
    bullets = (
        [str(b).strip() for b in bullets_raw if str(b).strip()][:3]
        if isinstance(bullets_raw, list)
        else []
    )
    points_raw = data.get("talking_points", [])
    talking_points = (
        [str(p).strip() for p in points_raw if str(p).strip()][:3]
        if isinstance(points_raw, list)
        else []
    )
    return {
        "cover_letter": {"subject": subject, "body": body},
        "resume_tips": {"summary": summary, "bullet_suggestions": bullets},
        "talking_points": talking_points,
    }


def _build_prep_prompt(user_doc: dict, listing: dict, match_reason: str) -> str:
    resume = (user_doc.get("resume_text") or "")[:800]
    role = listing.get("role") or "Unknown role"
    company = listing.get("company") or "Unknown company"
    description = (
        listing.get("description_snippet")
        or listing.get("description")
        or ""
    )[:1200]
    return (
        f"Role: {role} at {company}\n"
        f"Match reason: {match_reason}\n"
        f"Job description:\n{description or 'Not available.'}\n\n"
        f"Candidate resume:\n{resume or 'No resume on file.'}\n\n"
        "Draft a tailored cover letter and suggest-only resume improvement tips."
    )


async def generate_opportunity_prep(
    user_id: str,
    user_doc: dict,
    listing: dict,
    match_reason: str,
) -> dict | None:
    """Generate cover letter and resume tips via OpenRouter."""
    if not settings.openrouter_api_key:
        return None

    user_msg = _build_prep_prompt(user_doc, listing, match_reason)
    model = settings.openrouter_default_model
    cache_key = compute_cache_key(model, user_msg[:500] + ":prep", PROVIDER_OPENROUTER)

    cached = await get_cached_response(cache_key)
    if cached is not None:
        return cached

    if not await check_budget(PROVIDER_OPENROUTER):
        return None

    try:
        await check_and_increment_quota(user_id, PROVIDER_OPENROUTER)
    except QuotaExceededError:
        logger.warning("autopilot_prep_quota_exceeded", user_id=user_id)
        return None

    try:
        data, input_tokens, output_tokens = await complete_json_with_usage(
            PREP_SYSTEM_PROMPT,
            user_msg,
            temperature=0.4,
            max_tokens=PREP_GENERATION_MAX_TOKENS,
            timeout=PREP_GENERATION_TIMEOUT_SECONDS,
        )
        result = _validate_prep(data)
    except OpenRouterError:
        return None

    if result is not None:
        await store_response(
            cache_key, result, model, input_tokens, output_tokens, PROVIDER_OPENROUTER
        )
    return result
