"""Unit tests for autopilot match_scorer."""

from unittest.mock import AsyncMock, patch

import pytest

from autopilot.match_scorer import ensure_listing_description, score_listing_for_user
from config import settings

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_score_listing_returns_score_and_reason(app):
    user_doc = {"resume_text": "Python FastAPI developer"}
    listing = {
        "_id": None,
        "role": "Backend Engineer",
        "company": "Acme",
        "description_snippet": "Python and FastAPI required.",
    }

    with patch.object(settings, "openrouter_api_key", "test-key"), patch(
        "autopilot.match_scorer.complete_json_with_usage",
        new_callable=AsyncMock,
        return_value=({"score": 88, "reason": "Strong Python fit."}, 10, 20),
    ), patch("autopilot.match_scorer.get_cached_response", new_callable=AsyncMock, return_value=None), patch(
        "autopilot.match_scorer.check_budget", new_callable=AsyncMock, return_value=True
    ), patch(
        "autopilot.match_scorer.check_and_increment_quota", new_callable=AsyncMock
    ), patch(
        "autopilot.match_scorer.store_response", new_callable=AsyncMock
    ):
        result = await score_listing_for_user("user123", user_doc, listing)

    assert result == {"score": 88, "reason": "Strong Python fit."}


async def test_score_listing_handles_missing_description(app):
    user_doc = {"resume_text": "Engineer"}
    listing = {"role": "Engineer", "company": "Co"}

    with patch.object(settings, "openrouter_api_key", "test-key"), patch(
        "autopilot.match_scorer.ensure_listing_description",
        new_callable=AsyncMock,
        return_value="",
    ), patch(
        "autopilot.match_scorer.complete_json_with_usage",
        new_callable=AsyncMock,
        return_value=({"score": 70, "reason": "Limited info."}, 5, 10),
    ), patch("autopilot.match_scorer.get_cached_response", new_callable=AsyncMock, return_value=None), patch(
        "autopilot.match_scorer.check_budget", new_callable=AsyncMock, return_value=True
    ), patch(
        "autopilot.match_scorer.check_and_increment_quota", new_callable=AsyncMock
    ), patch(
        "autopilot.match_scorer.store_response", new_callable=AsyncMock
    ):
        result = await score_listing_for_user("user123", user_doc, listing)

    assert result["score"] == 70


async def test_ensure_listing_description_uses_cached_snippet(app):
    listing = {"description_snippet": "Already cached"}
    result = await ensure_listing_description(listing)
    assert result == "Already cached"
