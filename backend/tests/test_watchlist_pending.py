"""Tests for watchlist pending opportunity queueing."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from bson import ObjectId

import database
from autopilot.constants import PENDING_STATUS, SOURCE_WATCHLIST
from watchlist.matcher import queue_watchlist_matches

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_queue_watchlist_matches_inserts_pending_with_source(app, test_user):
    user, _ = test_user
    uid = ObjectId(user["id"])
    listing_id = ObjectId()

    await database.get_collection("users").update_one(
        {"_id": uid},
        {"$set": {
            "resume_text": "Python engineer",
            "autopilot_min_match_score": 80,
        }},
    )
    await database.get_collection("job_listings").insert_one({
        "_id": listing_id,
        "company": "Acme",
        "role": "Backend Engineer",
        "apply_url": "https://example.com/jobs/acme-watchlist",
        "url_hash": "abc123",
        "ingested_at": datetime.now(timezone.utc),
    })

    user_doc = await database.get_collection("users").find_one({"_id": uid})

    with patch(
        "watchlist.matcher.score_listing_for_user",
        new_callable=AsyncMock,
        return_value={"score": 90, "reason": "Strong fit"},
    ), patch(
        "watchlist.matcher.generate_opportunity_prep",
        new_callable=AsyncMock,
        return_value={
            "cover_letter": {"subject": "Hi", "body": "Body"},
            "resume_tips": {"summary": "Tip", "bullet_suggestions": []},
        },
    ), patch(
        "watchlist.matcher.log_agent_run",
        new_callable=AsyncMock,
    ):
        created = await queue_watchlist_matches(user_doc, [listing_id])

    assert created == 1
    pending = await database.get_collection("pending_opportunities").find_one({"user_id": uid})
    assert pending["status"] == PENDING_STATUS
    assert pending["source"] == SOURCE_WATCHLIST
    assert pending["match_score"] == 90
