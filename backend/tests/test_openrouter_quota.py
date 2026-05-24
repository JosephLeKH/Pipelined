"""Tests for OpenRouter quota and budget integration."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from bson import ObjectId

import database
from applications.interview_prep.fit_score import compute_fit_score
from email_integration.classifier import classify_email
from parsing.ai_cache import QuotaExceededError, check_and_increment_quota

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_classifier_returns_none_when_openrouter_budget_exceeded(monkeypatch):
    monkeypatch.setattr("email_integration.classifier.settings.openrouter_api_key", "or-key")
    monkeypatch.setattr("email_integration.classifier.settings.gemini_api_key", "")

    with patch(
        "email_integration.classifier.check_budget",
        new_callable=AsyncMock,
        return_value=False,
    ):
        result = await classify_email("Interview invite", "Please join us")

    assert result is None


async def test_compute_fit_score_raises_quota_exceeded(monkeypatch):
    monkeypatch.setattr(
        "applications.interview_prep.fit_score.settings.openrouter_api_key", "or-key"
    )
    monkeypatch.setattr(
        "applications.interview_prep.fit_score.settings.openrouter_default_model",
        "google/gemini-2.0-flash-001",
    )
    monkeypatch.setattr("applications.interview_prep.fit_score.settings.gemini_api_key", "")
    monkeypatch.setattr("parsing.ai_cache.settings.ai_fit_scores_daily_limit", 20)

    user_id = str(ObjectId())
    app_id = str(ObjectId())
    today = datetime.now(timezone.utc).date().isoformat()

    if database.db is not None:
        await database.db["users"].insert_one({
            "_id": ObjectId(user_id),
            "email": "openrouter-quota@example.com",
            "ai_usage": {"last_reset_date": today, "fit_scores_today": 20},
        })
        await database.db["applications"].insert_one({
            "_id": ObjectId(app_id),
            "user_id": ObjectId(user_id),
            "company": "Acme",
            "role_title": "Engineer",
            "source": "manual",
        })

    with patch(
        "applications.interview_prep.fit_score.check_budget",
        new_callable=AsyncMock,
        return_value=True,
    ), patch(
        "applications.interview_prep.fit_score.get_cached_response",
        new_callable=AsyncMock,
        return_value=None,
    ), patch(
        "applications.interview_prep.fit_score.check_and_increment_quota",
        new_callable=AsyncMock,
        side_effect=QuotaExceededError(20),
    ):
        with pytest.raises(QuotaExceededError):
            await compute_fit_score(user_id, app_id, "Acme", "Engineer", "Python resume")


async def test_openrouter_quota_increment_blocks_21st_call(monkeypatch):
    """Direct quota check raises on the 21st OpenRouter fit-score call."""
    monkeypatch.setattr("parsing.ai_cache.settings.ai_fit_scores_daily_limit", 20)

    user_id = str(ObjectId())
    today = datetime.now(timezone.utc).date().isoformat()

    if database.db is not None:
        await database.db["users"].insert_one({
            "_id": ObjectId(user_id),
            "email": "openrouter-quota-direct@example.com",
            "ai_usage": {"last_reset_date": today, "fit_scores_today": 20},
        })

        with pytest.raises(QuotaExceededError) as exc_info:
            await check_and_increment_quota(user_id)

        assert exc_info.value.limit == 20
