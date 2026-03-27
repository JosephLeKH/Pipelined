"""Tests for parsing/openai_client.py — parse_with_openai()."""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from parsing.openai_client import EXPECTED_FIELDS, parse_with_openai


def _make_openai_response(content: str) -> MagicMock:
    """Build a minimal mock of the OpenAI chat completion response object."""
    message = MagicMock()
    message.content = content

    choice = MagicMock()
    choice.message = message

    response = MagicMock()
    response.choices = [choice]
    return response


VALID_PAYLOAD = {
    "role_title": "Software Engineer",
    "company_name": "Acme Corp",
    "compensation": "$120k",
    "company_type": "startup",
    "location": "San Francisco, CA",
    "remote_status": "hybrid",
}


@pytest.mark.asyncio
async def test_parse_with_openai_returns_all_six_fields_on_success():
    # Arrange
    mock_response = _make_openai_response(json.dumps(VALID_PAYLOAD))

    with patch("parsing.openai_client.settings") as mock_settings, patch(
        "parsing.openai_client._get_client"
    ) as mock_get_client:
        mock_settings.openai_api_key = "sk-test"
        mock_settings.openai_model = "gpt-4o-mini"
        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_get_client.return_value = mock_client

        # Act
        result = await parse_with_openai("Software Engineer at Acme Corp, $120k, hybrid in SF")

    # Assert
    assert set(result.keys()) == EXPECTED_FIELDS
    assert result["role_title"] == "Software Engineer"
    assert result["company_name"] == "Acme Corp"
    assert result["remote_status"] == "hybrid"


@pytest.mark.asyncio
async def test_parse_with_openai_returns_null_result_when_api_key_missing():
    # Arrange
    with patch("parsing.openai_client.settings") as mock_settings:
        mock_settings.openai_api_key = ""

        # Act
        result = await parse_with_openai("some page text")

    # Assert
    assert set(result.keys()) == EXPECTED_FIELDS
    assert all(v is None for v in result.values())


@pytest.mark.asyncio
async def test_parse_with_openai_returns_null_result_on_openai_error():
    # Arrange
    from openai import OpenAIError

    with patch("parsing.openai_client.settings") as mock_settings, patch(
        "parsing.openai_client._get_client"
    ) as mock_get_client:
        mock_settings.openai_api_key = "sk-test"
        mock_settings.openai_model = "gpt-4o-mini"
        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(side_effect=OpenAIError("timeout"))
        mock_get_client.return_value = mock_client

        # Act
        result = await parse_with_openai("some page text")

    # Assert
    assert set(result.keys()) == EXPECTED_FIELDS
    assert all(v is None for v in result.values())


@pytest.mark.asyncio
async def test_parse_with_openai_returns_null_result_on_invalid_json():
    # Arrange
    mock_response = _make_openai_response("not valid json at all")

    with patch("parsing.openai_client.settings") as mock_settings, patch(
        "parsing.openai_client._get_client"
    ) as mock_get_client:
        mock_settings.openai_api_key = "sk-test"
        mock_settings.openai_model = "gpt-4o-mini"
        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_get_client.return_value = mock_client

        # Act
        result = await parse_with_openai("some page text")

    # Assert
    assert all(v is None for v in result.values())


@pytest.mark.asyncio
async def test_parse_with_openai_returns_null_result_when_response_missing_fields():
    # Arrange — response has only 2 of 6 required fields
    partial = {"role_title": "Engineer", "company_name": "Acme"}
    mock_response = _make_openai_response(json.dumps(partial))

    with patch("parsing.openai_client.settings") as mock_settings, patch(
        "parsing.openai_client._get_client"
    ) as mock_get_client:
        mock_settings.openai_api_key = "sk-test"
        mock_settings.openai_model = "gpt-4o-mini"
        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_get_client.return_value = mock_client

        # Act
        result = await parse_with_openai("some page text")

    # Assert
    assert all(v is None for v in result.values())


@pytest.mark.asyncio
async def test_parse_with_openai_returns_null_for_missing_optional_fields():
    # Arrange — valid structure but optional fields are null
    payload = {
        "role_title": "Engineer",
        "company_name": "Acme",
        "compensation": None,
        "company_type": None,
        "location": None,
        "remote_status": None,
    }
    mock_response = _make_openai_response(json.dumps(payload))

    with patch("parsing.openai_client.settings") as mock_settings, patch(
        "parsing.openai_client._get_client"
    ) as mock_get_client:
        mock_settings.openai_api_key = "sk-test"
        mock_settings.openai_model = "gpt-4o-mini"
        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_get_client.return_value = mock_client

        # Act
        result = await parse_with_openai("some text")

    # Assert
    assert result["role_title"] == "Engineer"
    assert result["company_name"] == "Acme"
    assert result["compensation"] is None
    assert result["remote_status"] is None
