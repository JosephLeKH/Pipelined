"""Extract OA/take-home deadlines from assessment invite emails via OpenRouter."""

import asyncio
import json
import re
from datetime import datetime, timezone

import structlog
from openai import APIConnectionError, APITimeoutError, AsyncOpenAI

from ai.openrouter_client import OpenRouterError, complete_json
from config import settings
from parsing.ai_cache import PROVIDER_OPENROUTER, check_budget

logger = structlog.get_logger()

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
GEMINI_MODEL = "gemini-2.0-flash"
MAX_BODY_CHARS = 2000
DEADLINE_PARSE_TIMEOUT_SECONDS = 10.0
DEADLINE_PARSE_RETRY_ATTEMPTS = 2
DEADLINE_PARSE_RETRY_BACKOFF_SECONDS = 1.0

SYSTEM_PROMPT = (
    "You extract the completion deadline from online assessment (OA) or take-home "
    "assignment invite emails.\n\n"
    "Return ONLY valid JSON with no markdown fences. Use null when no deadline is stated.\n"
    "Fields:\n"
    "- deadline: ISO 8601 datetime string in UTC (e.g. '2026-05-30T23:59:00Z') "
    "or date-only (e.g. '2026-05-30') when time is unspecified\n\n"
    "Example:\n"
    '{"deadline": "2026-05-30T23:59:00Z"}'
)


def _parse_deadline_response(content: str) -> str | None:
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", content.strip(), flags=re.DOTALL)
    data = json.loads(raw)
    if not isinstance(data, dict):
        return None
    deadline = data.get("deadline")
    if not deadline or not isinstance(deadline, str):
        return None
    return deadline.strip()


def normalize_deadline(value: str) -> datetime | None:
    """Parse an ISO deadline string into a timezone-aware datetime."""
    cleaned = value.strip()
    if not cleaned:
        return None
    try:
        if len(cleaned) == 10 and cleaned[4] == "-" and cleaned[7] == "-":
            parsed = datetime.fromisoformat(cleaned).replace(tzinfo=timezone.utc)
            return parsed.replace(hour=23, minute=59, second=59)
        parsed = datetime.fromisoformat(cleaned.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except ValueError:
        logger.warning("deadline_parse_invalid_format", deadline=cleaned)
        return None


async def _extract_with_openrouter(user_message: str) -> datetime | None:
    if not await check_budget(PROVIDER_OPENROUTER):
        logger.warning("deadline_parse_budget_exceeded", provider=PROVIDER_OPENROUTER)
        return None

    last_exc: Exception | None = None
    for attempt in range(DEADLINE_PARSE_RETRY_ATTEMPTS + 1):
        try:
            data = await complete_json(
                SYSTEM_PROMPT,
                user_message,
                temperature=0,
                max_tokens=100,
                timeout=DEADLINE_PARSE_TIMEOUT_SECONDS,
            )
            raw = data.get("deadline") if isinstance(data, dict) else None
            if not raw:
                return None
            return normalize_deadline(str(raw))
        except OpenRouterError as exc:
            last_exc = exc
            if attempt < DEADLINE_PARSE_RETRY_ATTEMPTS:
                await asyncio.sleep((attempt + 1) * DEADLINE_PARSE_RETRY_BACKOFF_SECONDS)
        except (json.JSONDecodeError, KeyError, ValueError):
            logger.warning("deadline_parse_validation_error")
            return None

    logger.warning(
        "deadline_parse_transient_failure",
        provider="openrouter",
        error=str(last_exc),
    )
    return None


async def _extract_with_gemini(user_message: str) -> datetime | None:
    gemini = AsyncOpenAI(api_key=settings.gemini_api_key, base_url=GEMINI_BASE_URL)
    last_exc: Exception | None = None
    for attempt in range(DEADLINE_PARSE_RETRY_ATTEMPTS + 1):
        try:
            response = await asyncio.wait_for(
                gemini.chat.completions.create(
                    model=GEMINI_MODEL,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_message},
                    ],
                    temperature=0,
                    max_tokens=100,
                ),
                timeout=DEADLINE_PARSE_TIMEOUT_SECONDS,
            )
            content = response.choices[0].message.content
            if not content:
                return None
            raw = _parse_deadline_response(content)
            if raw is None:
                return None
            return normalize_deadline(raw)
        except (asyncio.TimeoutError, APITimeoutError, APIConnectionError) as exc:
            last_exc = exc
            if attempt < DEADLINE_PARSE_RETRY_ATTEMPTS:
                await asyncio.sleep((attempt + 1) * DEADLINE_PARSE_RETRY_BACKOFF_SECONDS)
        except (json.JSONDecodeError, KeyError, ValueError):
            logger.warning("deadline_parse_validation_error")
            return None
        except Exception:
            logger.exception("deadline_parse_error")
            return None

    logger.warning(
        "deadline_parse_transient_failure",
        provider="gemini",
        error=str(last_exc),
    )
    return None


async def extract_oa_deadline(subject: str, body_snippet: str) -> datetime | None:
    """Return a parsed OA deadline datetime or None if extraction fails."""
    if not settings.openrouter_api_key and not settings.gemini_api_key:
        return None

    user_message = f"Subject: {subject}\n\nBody: {body_snippet[:MAX_BODY_CHARS]}"
    if settings.openrouter_api_key:
        return await _extract_with_openrouter(user_message)
    return await _extract_with_gemini(user_message)
