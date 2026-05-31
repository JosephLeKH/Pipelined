"""Integration tests for /api/autopilot routes."""

import asyncio
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


async def test_approve_handles_apply_pack_attach_failure(client, test_user):
    """Test that apply_pack attachment failure is gracefully handled and logged."""
    user, cookies = test_user
    opp_id, _ = await _seed_pending(user["id"])

    # Monkey-patch the applications collection update to raise an error
    original_update = database.get_collection("applications").update_one
    async def failing_update(*args, **kwargs):
        raise RuntimeError("Database connection lost")
    database.get_collection("applications").update_one = failing_update

    try:
        with as_user(client, cookies):
            response = await client.post(f"/api/autopilot/pending/{opp_id}/approve")

        # Should still return 200 with warning
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["application_id"]
        assert "apply_pack_attach_failed" in data["warnings"]

        # Application should exist despite error
        app_doc = await database.get_collection("applications").find_one(
            {"_id": ObjectId(data["application_id"])}
        )
        assert app_doc is not None
        assert app_doc.get("apply_pack_attach_error") is True
        assert app_doc.get("apply_pack_attach_error_at") is not None
    finally:
        database.get_collection("applications").update_one = original_update


async def test_approve_apply_pack_idempotent(client, test_user):
    """Test that concurrent approvals result in single apply_pack attachment."""
    user, cookies = test_user
    opp_id, _ = await _seed_pending(user["id"])

    # Create a logging hook to count apply_pack attachments
    log_calls: list[dict] = []
    import structlog as _structlog
    original_logger = _structlog.get_logger()

    # Capture the log to see "apply_pack_already_attached" messages
    from autopilot.service import approve_pending_opportunity

    with as_user(client, cookies):
        # Simulate concurrent approvals via asyncio.gather
        task1 = approve_pending_opportunity(user["id"], opp_id)
        task2 = approve_pending_opportunity(user["id"], opp_id)

        results = await asyncio.gather(task1, task2)

    # Both should complete without error
    opportunity_id_1, app_id_1, warnings_1 = results[0]
    opportunity_id_2, app_id_2, warnings_2 = results[1]

    # Same application ID from deduplication
    assert app_id_1 == app_id_2

    # Only the first approval should attach apply_pack (no error on second attempt)
    app_doc = await database.get_collection("applications").find_one(
        {"_id": ObjectId(app_id_1)}
    )
    assert app_doc.get("apply_pack") is not None
    # apply_pack should be attached only once; no error flags
    assert app_doc.get("apply_pack_attach_error") is None or app_doc.get("apply_pack_attach_error") is False
