"""Tests for ai/openrouter_client.py."""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from ai.openrouter_client import OpenRouterError, complete_json, get_openrouter_client

pytestmark = pytest.mark.asyncio(loop_scope="session")


def _make_response(content: str) -> MagicMock:
    message = MagicMock()
    message.content = content
    choice = MagicMock()
    choice.message = message
    response = MagicMock()
    response.choices = [choice]
    response.usage = MagicMock(prompt_tokens=10, completion_tokens=20)
    return response


def _stub_provider_client(monkeypatch, mock_create: AsyncMock) -> None:
    """Force a single provider (openrouter) and route _client_for to a mock."""
    monkeypatch.setattr("ai.openrouter_client.settings.do_inference_api_key", "")
    monkeypatch.setattr("ai.openrouter_client.settings.openrouter_api_key", "test-key")
    monkeypatch.setattr("ai.openrouter_client._do_client", None)
    monkeypatch.setattr("ai.openrouter_client._openrouter_client", None)

    mock_client = MagicMock()
    mock_client.chat.completions.create = mock_create
    monkeypatch.setattr(
        "ai.openrouter_client._client_for", lambda provider: mock_client
    )


async def test_complete_json_parses_valid_response(monkeypatch):
    mock_create = AsyncMock(return_value=_make_response('{"score": 82, "reason": "Strong match"}'))
    _stub_provider_client(monkeypatch, mock_create)

    result = await complete_json("system", "user prompt")

    assert result == {"score": 82, "reason": "Strong match"}
    mock_create.assert_awaited_once()


async def test_complete_json_sends_response_format_json_object(monkeypatch):
    """Forces models to emit syntactically valid JSON — critical for JSON-mode endpoints."""
    mock_create = AsyncMock(return_value=_make_response('{"ok": true}'))
    _stub_provider_client(monkeypatch, mock_create)

    await complete_json("system", "user")

    kwargs = mock_create.await_args.kwargs
    assert kwargs.get("response_format") == {"type": "json_object"}


async def test_complete_json_strips_markdown_fences(monkeypatch):
    fenced = '```json\n{"ok": true}\n```'
    mock_create = AsyncMock(return_value=_make_response(fenced))
    _stub_provider_client(monkeypatch, mock_create)

    result = await complete_json("system", "user")

    assert result == {"ok": True}


async def test_complete_json_raises_when_no_provider_configured(monkeypatch):
    monkeypatch.setattr("ai.openrouter_client.settings.openrouter_api_key", "")
    monkeypatch.setattr("ai.openrouter_client.settings.do_inference_api_key", "")
    monkeypatch.setattr("ai.openrouter_client.settings.gemini_api_key", "")

    with pytest.raises(OpenRouterError, match="No LLM provider configured"):
        await complete_json("system", "user")


async def test_complete_json_raises_on_invalid_json(monkeypatch):
    mock_create = AsyncMock(return_value=_make_response("not-json"))
    _stub_provider_client(monkeypatch, mock_create)

    with pytest.raises(OpenRouterError, match="valid JSON"):
        await complete_json("system", "user")


async def test_complete_json_raises_on_timeout(monkeypatch):
    _stub_provider_client(monkeypatch, AsyncMock(return_value=_make_response("{}")))

    with patch(
        "ai.openrouter_client.asyncio.wait_for",
        side_effect=asyncio.TimeoutError("timed out"),
    ):
        with pytest.raises(OpenRouterError):
            await complete_json("system", "user", timeout=1.0)


async def test_get_openrouter_client_uses_configured_base_url(monkeypatch):
    monkeypatch.setattr("ai.openrouter_client.settings.do_inference_api_key", "")
    monkeypatch.setattr("ai.openrouter_client.settings.openrouter_api_key", "test-key")
    monkeypatch.setattr(
        "ai.openrouter_client.settings.openrouter_base_url",
        "https://openrouter.ai/api/v1",
    )
    monkeypatch.setattr("ai.openrouter_client._openrouter_client", None)

    with patch("ai.openrouter_client.AsyncOpenAI") as mock_openai:
        get_openrouter_client()
        mock_openai.assert_called_once_with(
            api_key="test-key",
            base_url="https://openrouter.ai/api/v1",
        )
