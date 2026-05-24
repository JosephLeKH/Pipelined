"""Unit tests for email_integration.classifier module."""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

pytestmark = pytest.mark.asyncio(loop_scope="session")

from email_integration.classifier import (
    GmailTransientError,
    classify_email,
)


class TestClassifyEmail:
    """Tests for classify_email function."""

    async def test_classify_email_returns_none_when_no_api_key(self):
        """Should return None when neither OpenRouter nor Gemini is configured."""
        with patch("email_integration.classifier.settings") as mock_settings:
            mock_settings.openrouter_api_key = ""
            mock_settings.gemini_api_key = ""
            result = await classify_email("Subject", "Body snippet")
            assert result is None

    async def test_classify_email_openrouter_job_related_returns_data(self):
        """Should use OpenRouter when configured."""
        with patch("email_integration.classifier.settings") as mock_settings:
            mock_settings.openrouter_api_key = "or-key"
            mock_settings.gemini_api_key = "gem-key"
            with patch(
                "email_integration.classifier.complete_json",
                new_callable=AsyncMock,
                return_value={
                    "job_related": True,
                    "company": "Google",
                    "role_title": "SWE",
                    "stage": "Applied",
                },
            ) as mock_complete:
                result = await classify_email("Job Offer", "You are hired")

        mock_complete.assert_awaited_once()
        assert result == {
            "job_related": True,
            "company": "Google",
            "role_title": "SWE",
            "stage": "Applied",
        }

    async def test_classify_email_job_related_returns_data(self):
        """Should return extracted job data when Gemini fallback is used."""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = (
            '{"job_related": true, "company": "Google", '
            '"role_title": "SWE", "stage": "Applied"}'
        )

        with patch("email_integration.classifier.settings") as mock_settings:
            mock_settings.openrouter_api_key = ""
            mock_settings.gemini_api_key = "test-key"
            with patch(
                "email_integration.classifier.AsyncOpenAI"
            ) as MockClient:
                instance = MockClient.return_value
                instance.chat.completions.create = AsyncMock(
                    return_value=mock_response
                )

                result = await classify_email("Job Offer", "You are hired")
                assert result == {
                    "job_related": True,
                    "company": "Google",
                    "role_title": "SWE",
                    "stage": "Applied",
                }

    async def test_classify_email_not_job_related_returns_none(self):
        """Should return None when job_related is false."""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = '{"job_related": false}'

        with patch("email_integration.classifier.settings") as mock_settings:
            mock_settings.openrouter_api_key = ""
            mock_settings.gemini_api_key = "test-key"
            with patch(
                "email_integration.classifier.AsyncOpenAI"
            ) as MockClient:
                instance = MockClient.return_value
                instance.chat.completions.create = AsyncMock(
                    return_value=mock_response
                )

                result = await classify_email("Marketing Email", "Buy our stuff")
                assert result is None

    async def test_classify_email_strips_markdown_fences(self):
        """Should strip markdown code fences from Gemini response."""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = (
            '```json\n{"job_related": true, "company": "Acme", '
            '"role_title": null, "stage": "Applied"}\n```'
        )

        with patch("email_integration.classifier.settings") as mock_settings:
            mock_settings.openrouter_api_key = ""
            mock_settings.gemini_api_key = "test-key"
            with patch(
                "email_integration.classifier.AsyncOpenAI"
            ) as MockClient:
                instance = MockClient.return_value
                instance.chat.completions.create = AsyncMock(
                    return_value=mock_response
                )

                result = await classify_email("Interview", "Phone screen")
                assert result is not None
                assert result["company"] == "Acme"
                assert result["role_title"] is None
                assert result["job_related"] is True

    async def test_classify_email_raises_transient_error_on_timeout(self):
        """Should raise GmailTransientError after timeout retries."""
        with patch("email_integration.classifier.settings") as mock_settings:
            mock_settings.openrouter_api_key = ""
            mock_settings.gemini_api_key = "test-key"
            with patch(
                "email_integration.classifier.asyncio.wait_for",
                side_effect=asyncio.TimeoutError("Timeout"),
            ):
                with pytest.raises(GmailTransientError):
                    await classify_email("Subject", "Body")

    async def test_classify_email_returns_none_on_json_error(self):
        """Should return None when response is invalid JSON."""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "not valid json"

        with patch("email_integration.classifier.settings") as mock_settings:
            mock_settings.openrouter_api_key = ""
            mock_settings.gemini_api_key = "test-key"
            with patch(
                "email_integration.classifier.AsyncOpenAI"
            ) as MockClient:
                instance = MockClient.return_value
                instance.chat.completions.create = AsyncMock(
                    return_value=mock_response
                )

                result = await classify_email("Subject", "Body")
                assert result is None
