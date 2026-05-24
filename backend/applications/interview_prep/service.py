"""Follow-up draft generation service."""

import asyncio
import json
import re

import structlog
from openai import AsyncOpenAI

from ai.agent_log import AGENT_TYPE_FOLLOWUP, STATUS_FAILED, STATUS_SUCCESS, log_agent_run
from ai.openrouter_client import OpenRouterError, agent_llm_configured, complete_json_with_usage
from config import settings
from parsing.ai_cache import (
    PROVIDER_OPENAI,
    PROVIDER_OPENROUTER,
    QuotaExceededError,
    check_and_increment_quota,
    check_budget,
    compute_cache_key,
    get_cached_response,
    store_response,
)

logger = structlog.get_logger()

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
GEMINI_MODEL = "gemini-2.0-flash"
FOLLOWUP_TIMEOUT_SECONDS = 10.0

FOLLOWUP_SYSTEM_PROMPT = (
    "You are a professional job-search assistant. Write a short, polite follow-up "
    "email for a job application. Return ONLY valid JSON with keys: subject (string), "
    "body (string). Body should be 3-4 sentences, professional, and not desperate."
)


class FollowUpDraftError(Exception):
    """Raised when follow-up draft generation fails."""


class FollowUpBudgetError(Exception):
    """Raised when the shared AI budget is exceeded."""


def _build_user_message(app_doc: dict) -> str:
    company: str = app_doc.get("company", "")
    role_title: str = app_doc.get("role_title", app_doc.get("position", ""))
    current_stage: str = app_doc.get("current_stage", app_doc.get("stage", "Applied"))
    date_applied = app_doc.get("date_applied")
    date_applied_str = date_applied.isoformat() if date_applied else "Unknown"
    return (
        f"Company: {company}\nRole: {role_title}\n"
        f"Current stage: {current_stage}\nApplied: {date_applied_str}"
    )


def _normalize_draft(data: dict) -> dict:
    return {"subject": data.get("subject", ""), "body": data.get("body", "")}


async def _generate_with_openrouter(user_id: str, user_message: str) -> dict:
    model = settings.openrouter_default_model
    cache_key = compute_cache_key(model, user_message[:500], PROVIDER_OPENROUTER)
    cached = await get_cached_response(cache_key)
    if cached is not None:
        return cached

    if not await check_budget(PROVIDER_OPENROUTER):
        raise FollowUpBudgetError()

    await check_and_increment_quota(user_id, PROVIDER_OPENROUTER)
    data, input_tokens, output_tokens = await complete_json_with_usage(
        FOLLOWUP_SYSTEM_PROMPT,
        user_message,
        temperature=0.7,
        max_tokens=300,
        timeout=FOLLOWUP_TIMEOUT_SECONDS,
    )
    draft = _normalize_draft(data)
    await store_response(
        cache_key, draft, model, input_tokens, output_tokens, PROVIDER_OPENROUTER
    )
    return draft


async def _generate_with_gemini(user_id: str, user_message: str) -> dict:
    cache_key = compute_cache_key(GEMINI_MODEL, user_message[:500], PROVIDER_OPENAI)
    cached = await get_cached_response(cache_key)
    if cached is not None:
        return cached

    if not await check_budget(PROVIDER_OPENAI):
        raise FollowUpBudgetError()

    await check_and_increment_quota(user_id, PROVIDER_OPENAI)

    client = AsyncOpenAI(api_key=settings.gemini_api_key, base_url=GEMINI_BASE_URL)
    response = await asyncio.wait_for(
        client.chat.completions.create(
            model=GEMINI_MODEL,
            messages=[
                {"role": "system", "content": FOLLOWUP_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.7,
            max_tokens=300,
        ),
        timeout=FOLLOWUP_TIMEOUT_SECONDS,
    )
    content = response.choices[0].message.content
    if not content:
        raise FollowUpDraftError("empty response")
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", content.strip(), flags=re.DOTALL)
    draft = _normalize_draft(json.loads(raw))

    usage = response.usage
    input_tokens = usage.prompt_tokens if usage else 0
    output_tokens = usage.completion_tokens if usage else 0
    await store_response(
        cache_key, draft, GEMINI_MODEL, input_tokens, output_tokens, PROVIDER_OPENAI
    )
    return draft


async def generate_follow_up_draft(user_id: str, app_id: str, app_doc: dict) -> dict:
    """Generate a follow-up email draft with cache, quota, and agent logging."""
    if not agent_llm_configured():
        raise FollowUpDraftError("AI not configured")

    user_message = _build_user_message(app_doc)
    company = app_doc.get("company", "")

    try:
        if settings.openrouter_api_key:
            draft = await _generate_with_openrouter(user_id, user_message)
        else:
            draft = await _generate_with_gemini(user_id, user_message)
    except QuotaExceededError:
        raise
    except (OpenRouterError, asyncio.TimeoutError, json.JSONDecodeError, KeyError, ValueError) as exc:
        logger.exception("follow_up_draft_error", app_id=app_id)
        await log_agent_run(
            user_id,
            AGENT_TYPE_FOLLOWUP,
            STATUS_FAILED,
            f"Follow-up draft failed for {company or app_id}",
            application_id=app_id,
        )
        raise FollowUpDraftError(str(exc)) from exc

    await log_agent_run(
        user_id,
        AGENT_TYPE_FOLLOWUP,
        STATUS_SUCCESS,
        f"Follow-up draft ready for {company or app_id}",
        application_id=app_id,
    )
    return draft
