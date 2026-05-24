"""Unit tests for autopilot prep_generator."""

from unittest.mock import AsyncMock, patch

import pytest

from autopilot.prep_generator import generate_opportunity_prep
from config import settings

pytestmark = pytest.mark.asyncio(loop_scope="session")

_MOCK_PREP = {
    "cover_letter": {"subject": "Application for Backend Engineer", "body": "Dear hiring manager..."},
    "resume_tips": {
        "summary": "Highlight Python experience.",
        "bullet_suggestions": ["Add FastAPI metrics to a bullet."],
    },
    "talking_points": ["5 years Python", "API design"],
}


async def test_generate_opportunity_prep_returns_cover_and_tips(app):
    user_doc = {"resume_text": "Python developer"}
    listing = {"role": "Backend Engineer", "company": "Acme", "description_snippet": "Python role"}

    with patch.object(settings, "openrouter_api_key", "test-key"), patch(
        "autopilot.prep_generator.complete_json_with_usage",
        new_callable=AsyncMock,
        return_value=(_MOCK_PREP, 20, 40),
    ), patch("autopilot.prep_generator.get_cached_response", new_callable=AsyncMock, return_value=None), patch(
        "autopilot.prep_generator.check_budget", new_callable=AsyncMock, return_value=True
    ), patch(
        "autopilot.prep_generator.check_and_increment_quota", new_callable=AsyncMock
    ), patch(
        "autopilot.prep_generator.store_response", new_callable=AsyncMock
    ):
        result = await generate_opportunity_prep("user123", user_doc, listing, "Strong fit")

    assert result["cover_letter"]["subject"].startswith("Application")
    assert result["resume_tips"]["bullet_suggestions"]
    assert result["talking_points"] == ["5 years Python", "API design"]
