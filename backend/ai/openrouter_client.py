"""OpenRouter LLM client for agent features."""

import asyncio
import json
import re

import structlog
from openai import APIConnectionError, APITimeoutError, AsyncOpenAI, OpenAIError

from config import settings

logger = structlog.get_logger()

DEFAULT_TEMPERATURE = 0.3
DEFAULT_MAX_TOKENS = 500
DEFAULT_TIMEOUT_SECONDS = 15.0
_FENCE_PATTERN = re.compile(r"^```(?:json)?\s*|\s*```$", re.DOTALL)

_client: AsyncOpenAI | None = None


class OpenRouterError(Exception):
    """Raised when an OpenRouter JSON completion fails."""


def agent_llm_configured() -> bool:
    """Return True when OpenRouter or legacy Gemini is configured."""
    return bool(settings.openrouter_api_key or settings.gemini_api_key)


def get_openrouter_client() -> AsyncOpenAI:
    """Return a cached AsyncOpenAI client pointed at OpenRouter."""
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=settings.openrouter_api_key,
            base_url=settings.openrouter_base_url,
        )
    return _client


def _strip_markdown_fences(content: str) -> str:
    return _FENCE_PATTERN.sub("", content.strip())


async def complete_json(
    system: str,
    user: str,
    *,
    model: str | None = None,
    temperature: float = DEFAULT_TEMPERATURE,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
) -> dict:
    """Call OpenRouter chat completions and parse a JSON object from the response."""
    if not settings.openrouter_api_key:
        raise OpenRouterError("OpenRouter API key is not configured")

    resolved_model = model or settings.openrouter_default_model
    client = get_openrouter_client()

    try:
        response = await asyncio.wait_for(
            client.chat.completions.create(
                model=resolved_model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
            ),
            timeout=timeout,
        )
    except (asyncio.TimeoutError, APITimeoutError, APIConnectionError, OpenAIError) as exc:
        logger.warning("openrouter_request_failed", model=resolved_model, error=str(exc))
        raise OpenRouterError(str(exc)) from exc

    content = response.choices[0].message.content
    if not content:
        raise OpenRouterError("OpenRouter returned empty content")

    try:
        raw = _strip_markdown_fences(content)
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.warning("openrouter_json_parse_failed", model=resolved_model)
        raise OpenRouterError("OpenRouter response was not valid JSON") from exc

    if not isinstance(parsed, dict):
        raise OpenRouterError("OpenRouter response was not a JSON object")

    return parsed
