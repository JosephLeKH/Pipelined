"""Tests for parsing/fit_scorer.py — mocks OpenAI, verifies output shape and error fallback."""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from parsing.fit_scorer import FIT_SCORE_FIELDS, score_fit

pytestmark = pytest.mark.asyncio(loop_scope="session")


def _make_openai_response(content: str) -> MagicMock:
    msg = MagicMock()
    msg.content = content
    choice = MagicMock()
    choice.message = msg
    resp = MagicMock()
    resp.choices = [choice]
    resp.usage = None
    return resp


VALID_PAYLOAD = {
    "fit_score": 78,
    "matched_skills": ["Python", "FastAPI", "MongoDB"],
    "missing_skills": ["Kubernetes", "Terraform"],
    "summary": "Strong backend match; lacks infra experience.",
}


async def test_score_fit_returns_valid_shape(monkeypatch):
    monkeypatch.setattr("parsing.fit_scorer.settings.openai_api_key", "test-key")
    monkeypatch.setattr("parsing.fit_scorer.settings.openai_model", "gpt-4o-mini")

    mock_create = AsyncMock(return_value=_make_openai_response(json.dumps(VALID_PAYLOAD)))
    with patch("parsing.fit_scorer._get_client") as mock_client_fn:
        mock_client = MagicMock()
        mock_client.chat.completions.create = mock_create
        mock_client_fn.return_value = mock_client

        result = await score_fit("Senior engineer with Python skills.", "Backend engineer role.")

    assert result["fit_score"] == 78
    assert "Python" in result["matched_skills"]
    assert "Kubernetes" in result["missing_skills"]
    assert isinstance(result["summary"], str)
    assert FIT_SCORE_FIELDS.issubset(result.keys())


async def test_score_fit_returns_nulls_on_openai_error(monkeypatch):
    from openai import OpenAIError

    monkeypatch.setattr("parsing.fit_scorer.settings.openai_api_key", "test-key")
    monkeypatch.setattr("parsing.fit_scorer.settings.openai_model", "gpt-4o-mini")

    mock_create = AsyncMock(side_effect=OpenAIError("timeout"))
    with patch("parsing.fit_scorer._get_client") as mock_client_fn:
        mock_client = MagicMock()
        mock_client.chat.completions.create = mock_create
        mock_client_fn.return_value = mock_client

        result = await score_fit("Resume text.", "Job description.")

    assert result["fit_score"] is None
    assert result["matched_skills"] is None
    assert result["missing_skills"] is None
    assert result["summary"] is None


async def test_score_fit_returns_nulls_on_invalid_json(monkeypatch):
    monkeypatch.setattr("parsing.fit_scorer.settings.openai_api_key", "test-key")
    monkeypatch.setattr("parsing.fit_scorer.settings.openai_model", "gpt-4o-mini")

    mock_create = AsyncMock(return_value=_make_openai_response("not-json"))
    with patch("parsing.fit_scorer._get_client") as mock_client_fn:
        mock_client = MagicMock()
        mock_client.chat.completions.create = mock_create
        mock_client_fn.return_value = mock_client

        result = await score_fit("Resume text.", "Job description.")

    assert result["fit_score"] is None


async def test_score_fit_returns_nulls_when_fit_score_out_of_range(monkeypatch):
    monkeypatch.setattr("parsing.fit_scorer.settings.openai_api_key", "test-key")
    monkeypatch.setattr("parsing.fit_scorer.settings.openai_model", "gpt-4o-mini")

    bad_payload = {**VALID_PAYLOAD, "fit_score": 150}
    mock_create = AsyncMock(return_value=_make_openai_response(json.dumps(bad_payload)))
    with patch("parsing.fit_scorer._get_client") as mock_client_fn:
        mock_client = MagicMock()
        mock_client.chat.completions.create = mock_create
        mock_client_fn.return_value = mock_client

        result = await score_fit("Resume text.", "Job description.")

    assert result["fit_score"] is None


async def test_score_fit_returns_nulls_when_missing_fields(monkeypatch):
    monkeypatch.setattr("parsing.fit_scorer.settings.openai_api_key", "test-key")
    monkeypatch.setattr("parsing.fit_scorer.settings.openai_model", "gpt-4o-mini")

    incomplete = {"fit_score": 60}
    mock_create = AsyncMock(return_value=_make_openai_response(json.dumps(incomplete)))
    with patch("parsing.fit_scorer._get_client") as mock_client_fn:
        mock_client = MagicMock()
        mock_client.chat.completions.create = mock_create
        mock_client_fn.return_value = mock_client

        result = await score_fit("Resume text.", "Job description.")

    assert result["fit_score"] is None


async def test_score_fit_returns_nulls_when_no_api_key(monkeypatch):
    monkeypatch.setattr("parsing.fit_scorer.settings.openai_api_key", "")

    result = await score_fit("Resume text.", "Job description.")

    assert result["fit_score"] is None


async def test_score_fit_returns_nulls_when_empty_inputs(monkeypatch):
    monkeypatch.setattr("parsing.fit_scorer.settings.openai_api_key", "test-key")

    result = await score_fit("", "Job description.")

    assert result["fit_score"] is None


async def test_score_fit_truncates_skills_to_limits(monkeypatch):
    monkeypatch.setattr("parsing.fit_scorer.settings.openai_api_key", "test-key")
    monkeypatch.setattr("parsing.fit_scorer.settings.openai_model", "gpt-4o-mini")

    many_skills_payload = {
        **VALID_PAYLOAD,
        "matched_skills": [f"skill{i}" for i in range(20)],
        "missing_skills": [f"miss{i}" for i in range(10)],
    }
    mock_create = AsyncMock(return_value=_make_openai_response(json.dumps(many_skills_payload)))
    with patch("parsing.fit_scorer._get_client") as mock_client_fn:
        mock_client = MagicMock()
        mock_client.chat.completions.create = mock_create
        mock_client_fn.return_value = mock_client

        result = await score_fit("Resume text.", "Job description.")

    assert len(result["matched_skills"]) <= 8
    assert len(result["missing_skills"]) <= 5
