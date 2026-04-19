"""OpenAI GPT-4o mini client for scoring resume-to-job fit."""

import json
from typing import Any

import structlog
from openai import AsyncOpenAI, OpenAIError

from config import settings
from parsing.ai_cache import (
    check_and_increment_quota,
    check_budget,
    compute_cache_key,
    get_cached_response,
    store_response,
)

logger = structlog.get_logger()

FIT_SCORE_TEMPERATURE = 0.0
FIT_SCORE_MAX_TOKENS = 300
FIT_SCORE_TIMEOUT_SECONDS = 8
MAX_MATCHED_SKILLS = 8
MAX_MISSING_SKILLS = 5

FIT_SCORE_FIELDS = {"fit_score", "matched_skills", "missing_skills", "summary"}

SYSTEM_PROMPT = (
    "You are a recruiting assistant. Given a candidate resume and a job description, "
    "return a JSON object with exactly these 4 keys:\n"
    "- fit_score: integer 0-100 (how well the resume matches the job)\n"
    f"- matched_skills: array of up to {MAX_MATCHED_SKILLS} strings (skills from the resume that match the job)\n"
    f"- missing_skills: array of up to {MAX_MISSING_SKILLS} strings (skills the job requires but the resume lacks)\n"
    "- summary: string (1-2 sentence explanation of the fit score)\n"
    "Return only valid JSON with these 4 keys and no other text."
)

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            timeout=FIT_SCORE_TIMEOUT_SECONDS,
        )
    return _client


def _validate_parsed_result(parsed: dict) -> dict | None:
    """Validate OpenAI response fields and build the result dict.

    Returns the result dict on success, or None if validation fails.
    """
    if not FIT_SCORE_FIELDS.issubset(parsed.keys()):
        logger.warning("fit_score_response_missing_fields", keys=list(parsed.keys()))
        return None

    fit_score = parsed.get("fit_score")
    if not isinstance(fit_score, int) or not (0 <= fit_score <= 100):
        logger.warning("fit_score_invalid_value", fit_score=fit_score)
        return None

    matched = parsed.get("matched_skills") or []
    missing = parsed.get("missing_skills") or []

    return {
        "fit_score": fit_score,
        "matched_skills": matched[:MAX_MATCHED_SKILLS],
        "missing_skills": missing[:MAX_MISSING_SKILLS],
        "summary": parsed.get("summary"),
    }


async def _call_openai(
    client: AsyncOpenAI,
    resume_text: str,
    job_description: str,
) -> tuple[dict, Any] | None:
    """Call OpenAI and return (validated_result, response) or None on any error."""
    user_content = f"RESUME:\n{resume_text}\n\nJOB DESCRIPTION:\n{job_description}"

    try:
        response = await client.chat.completions.create(
            model=settings.openai_model,
            temperature=FIT_SCORE_TEMPERATURE,
            max_tokens=FIT_SCORE_MAX_TOKENS,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
        )
        raw = response.choices[0].message.content or ""
        parsed = json.loads(raw)
    except (OpenAIError, json.JSONDecodeError, IndexError, AttributeError) as exc:
        logger.warning("fit_score_failed", error=str(exc))
        return None

    result = _validate_parsed_result(parsed)
    if result is None:
        return None

    return result, response


async def _execute_score_fit(
    cache_key: str,
    null_result: dict,
    resume_text: str,
    job_description: str,
    user_id: str | None,
) -> dict:
    """Run cache lookup → budget check → quota → OpenAI call → cache store."""
    cached = await get_cached_response(cache_key)
    if cached is not None:
        return cached

    if not await check_budget():
        return null_result

    if user_id:
        await check_and_increment_quota(user_id)

    call_result = await _call_openai(_get_client(), resume_text, job_description)
    if call_result is None:
        return null_result

    result, response = call_result
    usage = response.usage
    input_tokens = usage.prompt_tokens if usage else 0
    output_tokens = usage.completion_tokens if usage else 0
    await store_response(cache_key, result, settings.openai_model, input_tokens, output_tokens)
    return result


async def score_fit(
    resume_text: str,
    job_description: str,
    user_id: str | None = None,
    role_title: str = "",
    company: str = "",
) -> dict:
    """Score how well a resume matches a job description using GPT-4o mini.

    Checks the cache before calling OpenAI. Enforces per-user daily quotas and
    the global monthly budget cap. On any error or exceeded limit, returns null values.

    Raises QuotaExceededError if user_id is provided and the daily limit is reached.
    """
    null_result: dict = {field: None for field in FIT_SCORE_FIELDS}

    if not settings.openai_api_key:
        logger.warning("openai_api_key_missing_for_fit_scorer")
        return null_result

    if not resume_text or not job_description:
        return null_result

    cache_key = compute_cache_key(
        settings.openai_model,
        resume_text[:500] + role_title + company,
    )
    return await _execute_score_fit(cache_key, null_result, resume_text, job_description, user_id)
