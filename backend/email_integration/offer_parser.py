"""Extract structured offer details from offer letter email snippets via OpenRouter."""

import asyncio
import json
import re

import structlog
from openai import APIConnectionError, APITimeoutError, AsyncOpenAI

from ai.openrouter_client import OpenRouterError, complete_json
from applications.schemas import OfferDetails
from config import settings
from parsing.ai_cache import PROVIDER_OPENROUTER, check_budget

logger = structlog.get_logger()

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
GEMINI_MODEL = "gemini-2.0-flash"
MAX_BODY_CHARS = 2000
OFFER_PARSE_TIMEOUT_SECONDS = 12.0
OFFER_PARSE_RETRY_ATTEMPTS = 2
OFFER_PARSE_RETRY_BACKOFF_SECONDS = 1.0

SYSTEM_PROMPT = (
    "You extract structured compensation and offer details from job offer letter emails.\n\n"
    "Return ONLY valid JSON with no markdown fences. Use null for unknown fields.\n"
    "Fields:\n"
    "- base_salary: annual base salary in USD as integer (e.g. 150000)\n"
    "- total_comp: total annual compensation in USD as integer if stated\n"
    "- equity: equity grant description as string (e.g. '0.1%')\n"
    "- equity_annual_value: annualized equity value in USD as integer if stated\n"
    "- vesting_years: integer vesting period in years\n"
    "- signing_bonus: signing bonus in USD as integer\n"
    "- benefits: brief benefits summary string\n"
    "- benefits_breakdown: object mapping benefit name to value string\n"
    "- start_date: start date string (e.g. '2026-06-01')\n"
    "- location: job location string\n"
    "- remote_policy: remote/hybrid/onsite policy string\n"
    "- deadline: offer response deadline string\n"
    "- notes: other notable offer terms as string\n\n"
    "Example:\n"
    '{"base_salary": 150000, "signing_bonus": 15000, "equity": "0.08%", '
    '"start_date": "2026-07-15", "location": "San Francisco, CA", '
    '"remote_policy": "Hybrid", "deadline": "2026-05-30", "notes": null}'
)


def _parse_offer_response(content: str) -> dict | None:
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", content.strip(), flags=re.DOTALL)
    data = json.loads(raw)
    if not isinstance(data, dict):
        return None
    return data


def _normalize_offer_details(data: dict) -> dict:
    """Validate and strip unknown keys via OfferDetails schema."""
    validated = OfferDetails.model_validate(data)
    return validated.model_dump(exclude_none=True)


async def _extract_with_openrouter(user_message: str) -> dict | None:
    if not await check_budget(PROVIDER_OPENROUTER):
        logger.warning("offer_parse_budget_exceeded", provider=PROVIDER_OPENROUTER)
        return None

    last_exc: Exception | None = None
    for attempt in range(OFFER_PARSE_RETRY_ATTEMPTS + 1):
        try:
            data = await complete_json(
                SYSTEM_PROMPT,
                user_message,
                temperature=0,
                max_tokens=400,
                timeout=OFFER_PARSE_TIMEOUT_SECONDS,
            )
            return _normalize_offer_details(data)
        except OpenRouterError as exc:
            last_exc = exc
            if attempt < OFFER_PARSE_RETRY_ATTEMPTS:
                await asyncio.sleep((attempt + 1) * OFFER_PARSE_RETRY_BACKOFF_SECONDS)
        except (json.JSONDecodeError, KeyError, ValueError):
            logger.warning("offer_parse_validation_error")
            return None

    logger.warning(
        "offer_parse_transient_failure",
        provider="openrouter",
        error=str(last_exc),
    )
    return None


async def _extract_with_gemini(user_message: str) -> dict | None:
    gemini = AsyncOpenAI(api_key=settings.gemini_api_key, base_url=GEMINI_BASE_URL)
    last_exc: Exception | None = None
    for attempt in range(OFFER_PARSE_RETRY_ATTEMPTS + 1):
        try:
            response = await asyncio.wait_for(
                gemini.chat.completions.create(
                    model=GEMINI_MODEL,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_message},
                    ],
                    temperature=0,
                    max_tokens=400,
                ),
                timeout=OFFER_PARSE_TIMEOUT_SECONDS,
            )
            content = response.choices[0].message.content
            if not content:
                return None
            parsed = _parse_offer_response(content)
            if parsed is None:
                return None
            return _normalize_offer_details(parsed)
        except (asyncio.TimeoutError, APITimeoutError, APIConnectionError) as exc:
            last_exc = exc
            if attempt < OFFER_PARSE_RETRY_ATTEMPTS:
                await asyncio.sleep((attempt + 1) * OFFER_PARSE_RETRY_BACKOFF_SECONDS)
        except (json.JSONDecodeError, KeyError, ValueError):
            logger.warning("offer_parse_validation_error")
            return None
        except Exception:
            logger.exception("offer_parse_error")
            return None

    logger.warning(
        "offer_parse_transient_failure",
        provider="gemini",
        error=str(last_exc),
    )
    return None


async def extract_offer_details(subject: str, body_snippet: str) -> dict | None:
    """Return validated offer_details dict or None if extraction fails."""
    if not settings.openrouter_api_key and not settings.gemini_api_key:
        return None

    user_message = f"Subject: {subject}\n\nBody: {body_snippet[:MAX_BODY_CHARS]}"
    if settings.openrouter_api_key:
        return await _extract_with_openrouter(user_message)
    return await _extract_with_gemini(user_message)
