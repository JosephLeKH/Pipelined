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
    return response


async def test_complete_json_parses_valid_response(monkeypatch):
    monkeypatch.setattr("ai.openrouter_client.settings.openrouter_api_key", "test-key")
    monkeypatch.setattr(
        "ai.openrouter_client.settings.openrouter_default_model",
        "google/gemini-2.0-flash-001",
    )

    mock_create = AsyncMock(return_value=_make_response('{"score": 82, "reason": "Strong match"}'))
    with patch("ai.openrouter_client.get_openrouter_client") as mock_client_fn:
        mock_client = MagicMock()
        mock_client.chat.completions.create = mock_create
        mock_client_fn.return_value = mock_client

        result = await complete_json("system", "user prompt")

    assert result == {"score": 82, "reason": "Strong match"}
    mock_create.assert_awaited_once()


async def test_complete_json_strips_markdown_fences(monkeypatch):
    monkeypatch.setattr("ai.openrouter_client.settings.openrouter_api_key", "test-key")

    fenced = '```json\n{"ok": true}\n```'
    mock_create = AsyncMock(return_value=_make_response(fenced))
    with patch("ai.openrouter_client.get_openrouter_client") as mock_client_fn:
        mock_client = MagicMock()
        mock_client.chat.completions.create = mock_create
        mock_client_fn.return_value = mock_client

        result = await complete_json("system", "user")

    assert result == {"ok": True}


async def test_complete_json_raises_when_api_key_missing(monkeypatch):
    monkeypatch.setattr("ai.openrouter_client.settings.openrouter_api_key", "")

    with pytest.raises(OpenRouterError, match="not configured"):
        await complete_json("system", "user")


async def test_complete_json_raises_on_invalid_json(monkeypatch):
    monkeypatch.setattr("ai.openrouter_client.settings.openrouter_api_key", "test-key")

    mock_create = AsyncMock(return_value=_make_response("not-json"))
    with patch("ai.openrouter_client.get_openrouter_client") as mock_client_fn:
        mock_client = MagicMock()
        mock_client.chat.completions.create = mock_create
        mock_client_fn.return_value = mock_client

        with pytest.raises(OpenRouterError, match="valid JSON"):
            await complete_json("system", "user")


async def test_complete_json_raises_on_timeout(monkeypatch):
    monkeypatch.setattr("ai.openrouter_client.settings.openrouter_api_key", "test-key")

    with patch(
        "ai.openrouter_client.asyncio.wait_for",
        side_effect=asyncio.TimeoutError("timed out"),
    ):
        with pytest.raises(OpenRouterError):
            await complete_json("system", "user", timeout=1.0)


async def test_get_openrouter_client_uses_configured_base_url(monkeypatch):
    monkeypatch.setattr("ai.openrouter_client.settings.openrouter_api_key", "test-key")
    monkeypatch.setattr(
        "ai.openrouter_client.settings.openrouter_base_url",
        "https://openrouter.ai/api/v1",
    )
    monkeypatch.setattr("ai.openrouter_client._client", None)

    with patch("ai.openrouter_client.AsyncOpenAI") as mock_openai:
        get_openrouter_client()
        mock_openai.assert_called_once_with(
            api_key="test-key",
            base_url="https://openrouter.ai/api/v1",
        )
