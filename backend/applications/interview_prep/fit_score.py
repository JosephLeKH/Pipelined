"""Standalone fit score computation — called by router and email service."""

import asyncio
import json
import re
from collections.abc import AsyncGenerator
from datetime import datetime, timezone

import structlog
from bson import ObjectId
from openai import AsyncOpenAI

from ai.agent_log import AGENT_TYPE_FIT, STATUS_FAILED, STATUS_SUCCESS, log_agent_run
from ai.next_action import NextAction
from ai.openrouter_client import OpenRouterError, complete_json_with_usage, stream_chat
from applications.interview_prep.fit_score_schemas import FitScoreResponse
from config import settings
from copilot.step_parser import StepParser
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

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
GEMINI_MODEL = "gemini-2.0-flash"
FIT_SCORE_TIMEOUT_SECONDS = 10.0

FIT_SCORE_SYSTEM_PROMPT = (
    "You are a career coach evaluating job application fit. Return ONLY valid JSON "
    "with keys: score (integer 0-100), reason (string, 1-2 sentences). "
    "Be direct and honest about fit."
)


def _validate_fit_score(data: dict) -> dict | None:
    score = int(data["score"])
    if not (0 <= score <= 100):
        return None
    return {"score": score, "reason": str(data.get("reason", ""))}


async def _score_with_openrouter(user_id: str, user_msg: str) -> dict | None:
    model = settings.openrouter_default_model
    cache_key = compute_cache_key(model, user_msg[:500], PROVIDER_OPENROUTER)

    cached = await get_cached_response(cache_key)
    if cached is not None:
        return cached

    if not await check_budget(PROVIDER_OPENROUTER):
        return None

    await check_and_increment_quota(user_id, PROVIDER_OPENROUTER)

    try:
        data, input_tokens, output_tokens = await complete_json_with_usage(
            FIT_SCORE_SYSTEM_PROMPT,
            user_msg,
            temperature=0.3,
            max_tokens=150,
            timeout=FIT_SCORE_TIMEOUT_SECONDS,
        )
        result = _validate_fit_score(data)
    except OpenRouterError:
        return None

    if result is not None:
        await store_response(
            cache_key, result, model, input_tokens, output_tokens, PROVIDER_OPENROUTER
        )
    return result


async def _score_with_gemini(user_msg: str) -> dict | None:
    client = AsyncOpenAI(api_key=settings.gemini_api_key, base_url=GEMINI_BASE_URL)
    try:
        resp = await asyncio.wait_for(
            client.chat.completions.create(
                model=GEMINI_MODEL,
                messages=[
                    {"role": "system", "content": FIT_SCORE_SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg},
                ],
                temperature=0.3,
                max_tokens=150,
            ),
            timeout=FIT_SCORE_TIMEOUT_SECONDS,
        )
        content = resp.choices[0].message.content
        if not content:
            return None
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", content.strip(), flags=re.DOTALL)
        return _validate_fit_score(json.loads(raw))
    except Exception:
        return None


async def compute_fit_score(
    user_id: str, app_id: str, company: str, role_title: str, resume_text: str
) -> FitScoreResponse | None:
    """Call OpenRouter or Gemini to compute fit score. Returns FitScoreResponse or None."""
    log = structlog.get_logger()

    if not settings.openrouter_api_key and not settings.gemini_api_key:
        return None

    user_msg = f"Role: {role_title} at {company}\nResume summary:\n{resume_text[:600]}"
    if settings.openrouter_api_key:
        result = await _score_with_openrouter(user_id, user_msg)
    else:
        result = await _score_with_gemini(user_msg)

    if result is None:
        log.warning("fit_score_failed", app_id=app_id)
        await log_agent_run(
            user_id, AGENT_TYPE_FIT, STATUS_FAILED, "Fit score generation failed", application_id=app_id
        )
        return None

    score = result["score"]
    reason = result.get("reason", "")

    # Populate next_action based on score
    next_action = None
    if score < 70:
        next_action = NextAction(
            label="Open Resume Insights",
            intent="navigate",
            payload={"to": f"/dashboard/{app_id}?tab=resume"},
        )
    else:
        next_action = NextAction(
            label="Open Apply Pack",
            intent="navigate",
            payload={"to": f"/dashboard/{app_id}?tab=apply-pack"},
        )

    await get_collection("applications").update_one(
        {"_id": ObjectId(app_id), "user_id": ObjectId(user_id)},
        {
            "$set": {
                "fit_score": score,
                "fit_score_reason": reason,
                "match_reason": reason,
                "fit_score_at": datetime.now(timezone.utc),
            }
        },
    )
    await log_agent_run(
        user_id,
        AGENT_TYPE_FIT,
        STATUS_SUCCESS,
        f"Fit score {score}: {reason[:120]}",
        application_id=app_id,
    )
    return FitScoreResponse(score=score, reason=reason, next_action=next_action)


async def stream_fit_score_with_steps(
    user_id: str,
    app_id: str,
    company: str,
    role_title: str,
    resume_text: str,
) -> AsyncGenerator[dict, None]:
    """Stream fit score computation with reasoning steps.

    Yields:
    - {type: "step", content: "..."} — reasoning step
    - {type: "token", content: "..."} — response token (usually JSON)
    - {type: "done", score: int, reason: str, next_action: {...}}
    """
    log = structlog.get_logger()

    if not settings.openrouter_api_key and not settings.gemini_api_key:
        yield {"type": "error", "message": "AI features not configured"}
        return

    user_msg = f"Role: {role_title} at {company}\nResume summary:\n{resume_text[:600]}"
    parser = StepParser()
    parts: list[str] = []

    try:
        async for delta in stream_chat(
            FIT_SCORE_SYSTEM_PROMPT,
            [{"role": "user", "content": user_msg}],
            temperature=0.3,
            max_tokens=150,
            timeout=FIT_SCORE_TIMEOUT_SECONDS,
            reasoning_enabled=settings.reasoning_enabled,
        ):
            parts.append(delta)
            for event_type, content in parser.feed(delta):
                if event_type == "step":
                    yield {"type": "step", "content": content}
                elif event_type == "token":
                    yield {"type": "token", "content": content}
    except OpenRouterError as exc:
        log.warning("fit_score_stream_error", app_id=app_id, error=str(exc))
        await log_agent_run(user_id, AGENT_TYPE_FIT, STATUS_FAILED, str(exc), application_id=app_id)
        yield {"type": "error", "message": "Fit score computation failed"}
        return

    # Flush remaining tokens
    for event_type, content in parser.flush():
        if event_type == "token":
            yield {"type": "token", "content": content}

    full_text = "".join(parts)
    # Strip step tags to extract JSON
    clean_text = re.sub(r"<step>.*?</step>", "", full_text, flags=re.DOTALL).strip()
    clean_text = re.sub(r"^```(?:json)?\s*|\s*```$", "", clean_text, flags=re.DOTALL).strip()

    try:
        result = json.loads(clean_text)
        validated = _validate_fit_score(result)
    except (json.JSONDecodeError, KeyError, ValueError):
        log.warning("fit_score_stream_json_parse_failed", app_id=app_id)
        await log_agent_run(
            user_id,
            AGENT_TYPE_FIT,
            STATUS_FAILED,
            "Invalid JSON response",
            application_id=app_id,
        )
        yield {"type": "error", "message": "Invalid fit score response"}
        return

    if validated is None:
        log.warning("fit_score_stream_validation_failed", app_id=app_id)
        await log_agent_run(
            user_id,
            AGENT_TYPE_FIT,
            STATUS_FAILED,
            "Validation failed",
            application_id=app_id,
        )
        yield {"type": "error", "message": "Fit score out of valid range"}
        return

    score = validated["score"]
    reason = validated.get("reason", "")

    # Populate next_action based on score
    next_action = None
    if score < 70:
        next_action = NextAction(
            label="Open Resume Insights",
            intent="navigate",
            payload={"to": f"/dashboard/{app_id}?tab=resume"},
        )
    else:
        next_action = NextAction(
            label="Open Apply Pack",
            intent="navigate",
            payload={"to": f"/dashboard/{app_id}?tab=apply-pack"},
        )

    await get_collection("applications").update_one(
        {"_id": ObjectId(app_id), "user_id": ObjectId(user_id)},
        {
            "$set": {
                "fit_score": score,
                "fit_score_reason": reason,
                "match_reason": reason,
                "fit_score_at": datetime.now(timezone.utc),
            }
        },
    )
    await log_agent_run(
        user_id,
        AGENT_TYPE_FIT,
        STATUS_SUCCESS,
        f"Fit score {score}: {reason[:120]}",
        application_id=app_id,
    )

    done_event: dict = {"type": "done", "score": score, "reason": reason}
    if next_action:
        done_event["next_action"] = next_action.model_dump()
    yield done_event
