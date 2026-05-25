"""Resume field extraction via OpenRouter."""

import json

import structlog
from openai import APIConnectionError, APITimeoutError, AsyncOpenAI, OpenAIError

from ai.openrouter_client import get_openrouter_client
from config import settings
from parsing.ai_cache import (
    check_budget,
    compute_cache_key,
    get_cached_response,
    store_response,
)

logger = structlog.get_logger()

PARSE_TEMPERATURE = 0.0
PARSE_MAX_TOKENS = 200
PARSE_TIMEOUT_SECONDS = 5
EXPECTED_FIELDS = {"role_title", "company_name", "compensation", "company_type", "location", "remote_status"}

SYSTEM_PROMPT = (
    "You are a job application data extractor. "
    "Given raw page text from a job posting, extract exactly these 6 fields as JSON: "
    "role_title, company_name, compensation, company_type, location, remote_status. "
    "Use null for any field you cannot determine. "
    "For remote_status use one of: remote, hybrid, onsite, or null. "
    "For company_type use one of: startup, mid, enterprise, gov, nonprofit, other, or null. "
    "Return only valid JSON with these 6 keys and no other text."
)


async def _call_completion(
    client: AsyncOpenAI, page_text: str
) -> tuple[dict | None, int, int]:
    """Call OpenRouter and parse JSON response.

    Returns (parsed_dict, input_tokens, output_tokens) or (None, 0, 0) on error.
    """
    try:
        response = await client.chat.completions.create(
            model=settings.openrouter_default_model,
            temperature=PARSE_TEMPERATURE,
            max_tokens=PARSE_MAX_TOKENS,
            timeout=PARSE_TIMEOUT_SECONDS,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": page_text},
            ],
        )
        raw = response.choices[0].message.content or ""
        parsed = json.loads(raw)
    except (OpenAIError, APIConnectionError, APITimeoutError, json.JSONDecodeError, IndexError, AttributeError) as exc:
        logger.warning("parse_failed", error=str(exc))
        return None, 0, 0
    usage = response.usage
    input_tokens = usage.prompt_tokens if usage else 0
    output_tokens = usage.completion_tokens if usage else 0
    return parsed, input_tokens, output_tokens


async def parse_with_openai(page_text: str) -> dict:
    """Extract job fields from raw page text via OpenRouter.

    Checks the cache before calling and enforces the monthly budget cap.
    Returns a dict with all 6 expected keys (None for any undetected field).
    """
    null_result: dict = {field: None for field in EXPECTED_FIELDS}

    if not settings.openrouter_api_key:
        logger.warning("openrouter_api_key_missing")
        return null_result

    cache_key = compute_cache_key(settings.openrouter_default_model, page_text[:500])
    cached = await get_cached_response(cache_key)
    if cached is not None:
        return cached

    if not await check_budget():
        return null_result

    parsed, input_tokens, output_tokens = await _call_completion(get_openrouter_client(), page_text)
    if parsed is None:
        return null_result

    if not EXPECTED_FIELDS.issubset(parsed.keys()):
        logger.warning("parse_response_missing_fields", keys=list(parsed.keys()))
        return null_result

    result = {field: parsed.get(field) for field in EXPECTED_FIELDS}
    await store_response(cache_key, result, settings.openrouter_default_model, input_tokens, output_tokens)
    return result
