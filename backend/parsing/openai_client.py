"""OpenAI GPT-4o mini client for parsing job application fields from page text."""

import json

import structlog
from openai import AsyncOpenAI, OpenAIError

from config import settings
from parsing.ai_cache import (
    check_budget,
    compute_cache_key,
    get_cached_response,
    store_response,
)

logger = structlog.get_logger()

OPENAI_TEMPERATURE = 0.0
OPENAI_MAX_TOKENS = 200
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

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            timeout=settings.openai_timeout_seconds,
        )
    return _client


async def _call_openai_completion(
    client: AsyncOpenAI, page_text: str
) -> tuple[dict | None, int, int]:
    """Call OpenAI and parse JSON response.

    Returns (parsed_dict, input_tokens, output_tokens) or (None, 0, 0) on error.
    """
    try:
        response = await client.chat.completions.create(
            model=settings.openai_model,
            temperature=OPENAI_TEMPERATURE,
            max_tokens=OPENAI_MAX_TOKENS,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": page_text},
            ],
        )
        raw = response.choices[0].message.content or ""
        parsed = json.loads(raw)
    except (OpenAIError, json.JSONDecodeError, IndexError, AttributeError) as exc:
        logger.warning("openai_parse_failed", error=str(exc))
        return None, 0, 0
    usage = response.usage
    input_tokens = usage.prompt_tokens if usage else 0
    output_tokens = usage.completion_tokens if usage else 0
    return parsed, input_tokens, output_tokens


async def parse_with_openai(page_text: str) -> dict:
    """Call GPT-4o mini to extract job fields from raw page text.

    Checks the cache before calling OpenAI and enforces the monthly budget cap.
    Returns a dict with all 6 expected keys. Any field that could not be
    determined or in case of failure is set to None.
    """
    null_result: dict = {field: None for field in EXPECTED_FIELDS}

    if not settings.openai_api_key:
        logger.warning("openai_api_key_missing")
        return null_result

    cache_key = compute_cache_key(settings.openai_model, page_text[:500])
    cached = await get_cached_response(cache_key)
    if cached is not None:
        return cached

    if not await check_budget():
        return null_result

    parsed, input_tokens, output_tokens = await _call_openai_completion(_get_client(), page_text)
    if parsed is None:
        return null_result

    if not EXPECTED_FIELDS.issubset(parsed.keys()):
        logger.warning("openai_response_missing_fields", keys=list(parsed.keys()))
        return null_result

    result = {field: parsed.get(field) for field in EXPECTED_FIELDS}
    await store_response(cache_key, result, settings.openai_model, input_tokens, output_tokens)
    return result
