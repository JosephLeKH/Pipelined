"""Integration tests for /api/autopilot routes."""

from datetime import datetime, timezone

import pytest
from bson import ObjectId

import database
from autopilot.constants import PENDING_STATUS
from tests.conftest import as_anonymous, as_user

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def _seed_pending(user_id: str) -> tuple[str, str]:
    listing_id = ObjectId()
    await database.get_collection("job_listings").insert_one({
        "_id": listing_id,
        "company": "Acme",
        "role": "Backend Engineer",
        "apply_url": "https://example.com/jobs/seed",
        "ingested_at": datetime.now(timezone.utc),
    })
    opp_id = ObjectId()
    await database.get_collection("pending_opportunities").insert_one({
        "_id": opp_id,
        "user_id": ObjectId(user_id),
        "job_listing_id": listing_id,
        "match_score": 92,
        "match_reason": "Strong fit",
        "cover_letter": {"subject": "Application", "body": "Dear team"},
        "resume_tips": {"summary": "Highlight Python", "bullet_suggestions": ["Add metrics"]},
        "talking_points": ["Strong Python overlap", "FastAPI experience"],
        "status": PENDING_STATUS,
        "created_at": datetime.now(timezone.utc),
        "reviewed_at": None,
    })
    return str(opp_id), str(listing_id)


async def test_list_pending_requires_auth(client):
    with as_anonymous(client):
        response = await client.get("/api/autopilot/pending")
    assert response.status_code == 401


async def test_list_pending_returns_user_opportunities(client, test_user):
    user, cookies = test_user
    opp_id, _ = await _seed_pending(user["id"])

    with as_user(client, cookies):
        response = await client.get("/api/autopilot/pending")

    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) == 1
    assert data[0]["id"] == opp_id
    assert data[0]["listing_company"] == "Acme"


async def test_approve_creates_to_apply_application(client, test_user):
    user, cookies = test_user
    opp_id, _ = await _seed_pending(user["id"])

    with as_user(client, cookies):
        response = await client.post(f"/api/autopilot/pending/{opp_id}/approve")

    assert response.status_code == 200
    app_id = response.json()["data"]["application_id"]
    app_doc = await database.get_collection("applications").find_one({"_id": ObjectId(app_id)})
    assert app_doc["current_stage"] == "To Apply"
    assert app_doc["source"] == "autopilot"
    assert app_doc["cover_letter_draft"]["subject"] == "Application"
    assert app_doc["apply_pack"]["talking_points"] == ["Strong Python overlap", "FastAPI experience"]
    assert "Dear team" in app_doc["apply_pack"]["cover_letter"]


async def test_dismiss_marks_opportunity_dismissed(client, test_user):
    user, cookies = test_user
    opp_id, _ = await _seed_pending(user["id"])

    with as_user(client, cookies):
        response = await client.post(f"/api/autopilot/pending/{opp_id}/dismiss")

    assert response.status_code == 200
    doc = await database.get_collection("pending_opportunities").find_one({"_id": ObjectId(opp_id)})
    assert doc["status"] == "dismissed"
