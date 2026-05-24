"""HTTP-level tests for POST /api/applications/{app_id}/thread-summary."""

from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from bson import ObjectId

import database
from email_integration.email_events import EMAIL_EVENTS_COLLECTION

pytestmark = pytest.mark.asyncio(loop_scope="session")

_UNAUTH_APP_ID = "507f1f77bcf86cd799439011"
MOCK_SUMMARY = {
    "summary": "Recruiter moved you to interviewing after an initial application email.",
    "reply_options": ["Confirm availability", "Ask about timeline", "Thank the recruiter"],
}


async def _create_app(client, cookies, company="Thread Co"):
    resp = await client.post(
        "/api/applications",
        json={"company": company, "role_title": "Engineer", "source": "email"},
        cookies=cookies,
    )
    assert resp.status_code == 201
    return resp.json()["data"]["id"]


async def _insert_email_event(user_id: str, app_id: str) -> None:
    await database.get_collection(EMAIL_EVENTS_COLLECTION).insert_one({
        "user_id": ObjectId(user_id),
        "type": "stage_updated",
        "timestamp": datetime.now(timezone.utc),
        "application_id": app_id,
        "company": "Thread Co",
        "role_title": "Engineer",
        "stage": "Interviewing",
        "subject": "Interview scheduled for next week",
    })


async def test_thread_summary_unauthenticated(client):
    resp = await client.post(f"/api/applications/{_UNAUTH_APP_ID}/thread-summary")
    assert resp.status_code == 401


async def test_thread_summary_no_email_events(client, test_user):
    _, cookies = test_user
    app_id = await _create_app(client, cookies)

    resp = await client.post(f"/api/applications/{app_id}/thread-summary", cookies=cookies)

    assert resp.status_code == 422
    assert resp.json()["detail"]["code"] == "NO_EMAIL_EVENTS"


async def test_thread_summary_success(client, test_user, monkeypatch):
    user, cookies = test_user
    app_id = await _create_app(client, cookies)
    await _insert_email_event(user["id"], app_id)

    monkeypatch.setattr("config.settings.openrouter_api_key", "test-key")
    with patch(
        "applications.thread_summary.service.complete_json",
        return_value=MOCK_SUMMARY,
    ):
        resp = await client.post(f"/api/applications/{app_id}/thread-summary", cookies=cookies)

    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["summary"] == MOCK_SUMMARY["summary"]
    assert len(data["reply_options"]) == 3
    assert "body" not in data

    doc = await database.get_collection("applications").find_one({"_id": ObjectId(app_id)})
    assert doc["thread_summary"]["summary"] == MOCK_SUMMARY["summary"]
    assert doc.get("thread_summary_at") is not None


async def test_thread_summary_no_api_key(client, test_user, monkeypatch):
    user, cookies = test_user
    app_id = await _create_app(client, cookies)
    await _insert_email_event(user["id"], app_id)

    monkeypatch.setattr("config.settings.openrouter_api_key", "")

    resp = await client.post(f"/api/applications/{app_id}/thread-summary", cookies=cookies)

    assert resp.status_code == 503


async def test_thread_summary_404_for_missing_app(client, test_user):
    _, cookies = test_user
    fake_id = str(ObjectId())

    resp = await client.post(f"/api/applications/{fake_id}/thread-summary", cookies=cookies)

    assert resp.status_code == 404
