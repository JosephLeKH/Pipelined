"""Tests for nightly autopilot scan job."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from bson import ObjectId

import database
from autopilot.constants import PENDING_STATUS
from autopilot.scan import autopilot_scan

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_autopilot_scan_respects_daily_cap_and_dedup(app, test_user):
    user, _ = test_user
    uid = ObjectId(user["id"])
    users = database.get_collection("users")
    await users.update_one(
        {"_id": uid},
        {"$set": {
            "autopilot_enabled": True,
            "autopilot_min_match_score": 80,
            "autopilot_max_daily": 1,
            "resume_text": "Python engineer",
        }},
    )

    listing_id = ObjectId()
    await database.get_collection("job_listings").insert_one({
        "_id": listing_id,
        "company": "Acme",
        "role": "Backend Engineer",
        "apply_url": "https://example.com/jobs/1",
        "ingested_at": datetime.now(timezone.utc),
        "description_snippet": "Python required",
    })

    recommended = [{
        "_id": listing_id,
        "company": "Acme",
        "role": "Backend Engineer",
        "apply_url": "https://example.com/jobs/1",
        "description_snippet": "Python required",
    }]

    with patch("autopilot.scan.get_recommended_listings", new_callable=AsyncMock, return_value=recommended), patch(
        "autopilot.scan.score_listing_for_user",
        new_callable=AsyncMock,
        return_value={"score": 90, "reason": "Great fit"},
    ), patch(
        "autopilot.scan.generate_opportunity_prep",
        new_callable=AsyncMock,
        return_value={
            "cover_letter": {"subject": "Hi", "body": "Body"},
            "resume_tips": {"summary": "Tip", "bullet_suggestions": []},
        },
    ):
        await autopilot_scan()

    pending = await database.get_collection("pending_opportunities").find({"user_id": uid}).to_list(length=10)
    assert len(pending) == 1
    assert pending[0]["status"] == PENDING_STATUS
    assert pending[0]["match_score"] == 90


async def test_autopilot_scan_skips_disabled_users(app, test_user):
    user, _ = test_user
    uid = ObjectId(user["id"])
    await database.get_collection("users").update_one(
        {"_id": uid},
        {"$set": {"autopilot_enabled": False, "resume_text": "Resume"}},
    )

    with patch("autopilot.scan.get_recommended_listings", new_callable=AsyncMock) as mock_recs:
        await autopilot_scan()
        mock_recs.assert_not_called()
