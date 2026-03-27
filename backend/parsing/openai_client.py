"""OpenAI GPT-4o mini client for parsing job application fields from page text."""

import json

import structlog
from openai import AsyncOpenAI, OpenAIError

from config import settings

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


async def parse_with_openai(page_text: str) -> dict:
    """Call GPT-4o mini to extract job fields from raw page text.

    Returns a dict with all 6 expected keys. Any field that could not be
    determined or in case of failure is set to None.
    """
    null_result: dict = {field: None for field in EXPECTED_FIELDS}

    if not settings.openai_api_key:
        logger.warning("openai_api_key_missing")
        return null_result

    client = _get_client()
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
        return null_result

    # Validate: must have all expected keys; ignore extra keys.
    if not EXPECTED_FIELDS.issubset(parsed.keys()):
        logger.warning("openai_response_missing_fields", keys=list(parsed.keys()))
        return null_result

    return {field: parsed.get(field) for field in EXPECTED_FIELDS}
