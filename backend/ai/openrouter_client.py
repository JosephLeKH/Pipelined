"""LLM client with DO GenAI as primary and OpenRouter as fallback.

Despite the module name, this routes through DigitalOcean's inference platform
when `DO_INFERENCE_API_KEY` is set, falling back to OpenRouter on transient
errors. The public functions are unchanged so call sites keep working.
"""

import asyncio
import json
import re
from dataclasses import dataclass

import structlog
from openai import APIConnectionError, APITimeoutError, AsyncOpenAI, OpenAIError, RateLimitError

from ai.exceptions import AIQuotaExceededError
from config import settings

logger = structlog.get_logger()

DEFAULT_TEMPERATURE = 0.3
DEFAULT_MAX_TOKENS = 500
DEFAULT_TIMEOUT_SECONDS = 15.0
_FENCE_PATTERN = re.compile(r"^```(?:json)?\s*|\s*```$", re.DOTALL)

_PROVIDER_DO = "do"
_PROVIDER_OPENROUTER = "openrouter"

_TRANSIENT_ERRORS: tuple[type[BaseException], ...] = (
    asyncio.TimeoutError,
    APITimeoutError,
    APIConnectionError,
    OpenAIError,
)


@dataclass(frozen=True)
class _Provider:
    name: str
    api_key: str
    base_url: str
    model: str


_do_client: AsyncOpenAI | None = None
_openrouter_client: AsyncOpenAI | None = None


class OpenRouterError(Exception):
    """Raised when an LLM completion fails on all configured providers."""


def agent_llm_configured() -> bool:
    """Return True when DO, OpenRouter, or legacy Gemini is configured."""
    return bool(
        settings.do_inference_api_key
        or settings.openrouter_api_key
        or settings.gemini_api_key
    )


def _do_provider() -> _Provider | None:
    if not settings.do_inference_api_key:
        return None
    return _Provider(
        name=_PROVIDER_DO,
        api_key=settings.do_inference_api_key,
        base_url=settings.do_inference_base_url,
        model=settings.do_default_model,
    )


def _openrouter_provider() -> _Provider | None:
    if not settings.openrouter_api_key:
        return None
    return _Provider(
        name=_PROVIDER_OPENROUTER,
        api_key=settings.openrouter_api_key,
        base_url=settings.openrouter_base_url,
        model=settings.openrouter_default_model,
    )


def _ordered_providers() -> list[_Provider]:
    """Return providers in priority order: DO primary, OpenRouter fallback."""
    return [p for p in (_do_provider(), _openrouter_provider()) if p is not None]


def _client_for(provider: _Provider) -> AsyncOpenAI:
    """Return a cached AsyncOpenAI client for the given provider."""
    global _do_client, _openrouter_client
    if provider.name == _PROVIDER_DO:
        if _do_client is None:
            _do_client = AsyncOpenAI(api_key=provider.api_key, base_url=provider.base_url)
        return _do_client
    if _openrouter_client is None:
        _openrouter_client = AsyncOpenAI(api_key=provider.api_key, base_url=provider.base_url)
    return _openrouter_client


def get_openrouter_client() -> AsyncOpenAI:
    """Return the primary LLM client (DO if configured, else OpenRouter).

    Name kept for backward compatibility; callers do not get automatic fallback.
    Prefer `chat_completion_with_fallback()` for new code that wants failover.
    """
    providers = _ordered_providers()
    if not providers:
        raise OpenRouterError("No LLM provider configured")
    return _client_for(providers[0])


def _build_chat_kwargs(
    provider: _Provider,
    messages: list[dict],
    max_tokens: int,
    temperature: float,
    tools: list | None,
    tool_choice: str | None,
) -> dict:
    """Assemble create() kwargs, pinning the provider's own default model."""
    kwargs: dict = {
        "model": provider.model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    if tools is not None:
        kwargs["tools"] = tools
    if tool_choice is not None:
        kwargs["tool_choice"] = tool_choice
    return kwargs


async def chat_completion_with_fallback(
    messages: list[dict],
    *,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    temperature: float = DEFAULT_TEMPERATURE,
    timeout: float | None = None,
    tools: list | None = None,
    tool_choice: str | None = None,
):
    """Chat completion against DO (primary) with OpenRouter fallback on transient errors.

    Uses each provider's configured default model so the model namespace matches
    the active provider (DO: llama; OpenRouter: gemini). Callers should prefer
    this over `get_openrouter_client().chat.completions.create()` whenever they
    want transparent failover plus correct model resolution.

    Returns the SDK's ChatCompletion so callers can read `.choices[0].message`,
    `.usage`, etc.
    """
    providers = _ordered_providers()
    if not providers:
        raise OpenRouterError("No LLM provider configured")

    last_exc: BaseException | None = None
    for provider in providers:
        client = _client_for(provider)
        kwargs = _build_chat_kwargs(
            provider, messages, max_tokens, temperature, tools, tool_choice
        )
        try:
            coro = client.chat.completions.create(**kwargs)
            if timeout is not None:
                return await asyncio.wait_for(coro, timeout=timeout)
            return await coro
        except RateLimitError as exc:
            logger.warning("llm_chat_quota", provider=provider.name, error=str(exc))
            raise AIQuotaExceededError() from exc
        except _TRANSIENT_ERRORS as exc:
            last_exc = exc
            logger.warning(
                "llm_chat_failed",
                provider=provider.name,
                model=provider.model,
                error=str(exc),
            )

    raise OpenRouterError(str(last_exc) if last_exc else "All LLM providers failed")


def _strip_markdown_fences(content: str) -> str:
    return _FENCE_PATTERN.sub("", content.strip())


async def _call_provider(
    provider: _Provider,
    system: str,
    user: str,
    *,
    model: str | None,
    temperature: float,
    max_tokens: int,
    timeout: float,
) -> tuple[dict, int, int]:
    """Single-provider JSON call. Raises OpenRouterError on any failure."""
    resolved_model = model or provider.model
    client = _client_for(provider)

    # response_format=json_object forces the model to emit syntactically valid
    # JSON. Supported by OpenAI, OpenRouter (with fallback prompting on models
    # that don't natively support it), and DO GenAI's Llama family.
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
                response_format={"type": "json_object"},
            ),
            timeout=timeout,
        )
    except RateLimitError as exc:
        logger.warning("llm_quota_exceeded", provider=provider.name, model=resolved_model, error=str(exc))
        raise AIQuotaExceededError() from exc
    except _TRANSIENT_ERRORS as exc:
        logger.warning("llm_request_failed", provider=provider.name, model=resolved_model, error=str(exc))
        raise OpenRouterError(str(exc)) from exc

    content = response.choices[0].message.content
    if not content:
        raise OpenRouterError(f"{provider.name} returned empty content")

    usage = response.usage
    input_tokens = usage.prompt_tokens if usage else 0
    output_tokens = usage.completion_tokens if usage else 0

    try:
        parsed = json.loads(_strip_markdown_fences(content))
    except json.JSONDecodeError as exc:
        logger.warning("llm_json_parse_failed", provider=provider.name, model=resolved_model)
        raise OpenRouterError(f"{provider.name} response was not valid JSON") from exc

    if not isinstance(parsed, dict):
        raise OpenRouterError(f"{provider.name} response was not a JSON object")

    return parsed, input_tokens, output_tokens


async def complete_json(
    system: str,
    user: str,
    *,
    model: str | None = None,
    temperature: float = DEFAULT_TEMPERATURE,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
) -> dict:
    """Call the LLM and parse a JSON object from the response."""
    parsed, _, _ = await complete_json_with_usage(
        system, user, model=model, temperature=temperature, max_tokens=max_tokens, timeout=timeout
    )
    return parsed


async def complete_json_with_usage(
    system: str,
    user: str,
    *,
    model: str | None = None,
    temperature: float = DEFAULT_TEMPERATURE,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
) -> tuple[dict, int, int]:
    """Try DO first, fall back to OpenRouter on transient error. Returns (parsed, in_tokens, out_tokens)."""
    providers = _ordered_providers()
    if not providers:
        raise OpenRouterError("No LLM provider configured")

    last_exc: OpenRouterError | None = None
    for provider in providers:
        try:
            return await _call_provider(
                provider, system, user,
                model=model, temperature=temperature, max_tokens=max_tokens, timeout=timeout,
            )
        except OpenRouterError as exc:
            last_exc = exc
            if provider is not providers[-1]:
                logger.warning("llm_falling_back", from_provider=provider.name)

    raise last_exc or OpenRouterError("All LLM providers failed")


async def _stream_provider(
    provider: _Provider,
    system: str,
    messages: list[dict[str, str]],
    *,
    model: str | None,
    temperature: float,
    max_tokens: int,
    timeout: float,
):
    """Open a streaming completion on a single provider."""
    resolved_model = model or provider.model
    client = _client_for(provider)
    payload_messages = [{"role": "system", "content": system}, *messages]

    try:
        stream = await asyncio.wait_for(
            client.chat.completions.create(
                model=resolved_model,
                messages=payload_messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            ),
            timeout=timeout,
        )
    except RateLimitError as exc:
        logger.warning("llm_stream_quota_exceeded", provider=provider.name, model=resolved_model, error=str(exc))
        raise AIQuotaExceededError() from exc
    except _TRANSIENT_ERRORS as exc:
        logger.warning("llm_stream_failed", provider=provider.name, model=resolved_model, error=str(exc))
        raise OpenRouterError(str(exc)) from exc

    async for chunk in stream:
        choice = chunk.choices[0] if chunk.choices else None
        if not choice or not choice.delta:
            continue
        delta = choice.delta.content
        if delta:
            yield delta


async def stream_chat(
    system: str,
    messages: list[dict[str, str]],
    *,
    model: str | None = None,
    temperature: float = DEFAULT_TEMPERATURE,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
    reasoning_enabled: bool = False,
):
    """Yield text deltas. Falls back from DO to OpenRouter only on initial connection failure.

    If reasoning_enabled is True, append an instruction to the system prompt to emit
    <step>...</step> tags for visible reasoning steps.
    """
    providers = _ordered_providers()
    if not providers:
        raise OpenRouterError("No LLM provider configured")

    # Augment system prompt with reasoning instruction if enabled and env allows it
    final_system = system
    if reasoning_enabled and settings.reasoning_enabled:
        final_system = (
            f"{system}\n\n"
            "Before answering, emit progress markers in the form `<step>Step description here</step>`. "
            "Examples: `<step>Retrieving your recent applications...</step>`, "
            "`<step>Analyzing JD requirements...</step>`. Emit at least 2 steps before the final answer."
        )

    last_exc: OpenRouterError | None = None
    for provider in providers:
        try:
            async for delta in _stream_provider(
                provider, final_system, messages,
                model=model, temperature=temperature, max_tokens=max_tokens, timeout=timeout,
            ):
                yield delta
            return
        except OpenRouterError as exc:
            last_exc = exc
            if provider is not providers[-1]:
                logger.warning("llm_stream_falling_back", from_provider=provider.name)

    raise last_exc or OpenRouterError("All LLM providers failed")
