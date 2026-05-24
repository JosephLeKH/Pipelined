"""Tests for email_events collection write path on Gmail classify."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from bson import ObjectId

import database
from auth.service import create_user
from email_integration.email_events import EMAIL_EVENTS_COLLECTION, log_email_event
from email_integration.service import _process_message

pytestmark = pytest.mark.asyncio(loop_scope="session")

CLASSIFY_RESULT = {
    "job_related": True,
    "company": "Acme Corp",
    "role_title": "Software Engineer",
    "stage": "Interview",
}


def _mock_gmail_message_response():
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = {
        "payload": {
            "headers": [
                {"name": "Subject", "value": "Interview invitation at Acme Corp"},
            ],
            "body": {"data": ""},
        },
    }
    return resp


async def test_log_email_event_persists_without_body(app):  # noqa: ARG001
    """Email events store extracted fields only — no email body."""
    user = await create_user("evt@example.com", "TestPass123!", "Event User")
    user_id = str(user["_id"])
    app_id = str(ObjectId())

    await log_email_event(
        user_id,
        event_type="stage_updated",
        application_id=app_id,
        company="Acme Corp",
        role_title="Engineer",
        stage="Interviewing",
        subject="Interview invite",
    )

    doc = await database.get_collection(EMAIL_EVENTS_COLLECTION).find_one(
        {"user_id": ObjectId(user_id)}
    )
    assert doc is not None
    assert doc["type"] == "stage_updated"
    assert doc["application_id"] == app_id
    assert doc["company"] == "Acme Corp"
    assert doc["stage"] == "Interviewing"
    assert doc["subject"] == "Interview invite"
    assert "body" not in doc


async def test_process_message_logs_email_event_on_stage_update(app):  # noqa: ARG001
    """Classifying an email for an existing app should persist an email_events row."""
    user = await create_user("proc@example.com", "TestPass123!", "Proc User")
    user_id = str(user["_id"])

    apps_col = database.get_collection("applications")
    result = await apps_col.insert_one({
        "user_id": ObjectId(user_id),
        "company": "Acme Corp",
        "role_title": "Software Engineer",
        "source": "email",
        "current_stage": "Applied",
        "deleted": False,
    })
    app_id = str(result.inserted_id)

    user_doc = {
        "_id": ObjectId(user_id),
        "gmail_status_updates": True,
        "gmail_auto_track": True,
    }

    mock_client = AsyncMock()
    mock_client.__aenter__.return_value.get = AsyncMock(
        return_value=_mock_gmail_message_response()
    )

    with patch("httpx.AsyncClient", return_value=mock_client):
        with patch(
            "email_integration.service.classify_email",
            new=AsyncMock(return_value=CLASSIFY_RESULT),
        ):
            created, updated = await _process_message(user_doc, "tok", "msg1")

    assert created is False
    assert updated is True

    event = await database.get_collection(EMAIL_EVENTS_COLLECTION).find_one(
        {"user_id": ObjectId(user_id), "application_id": app_id}
    )
    assert event is not None
    assert event["type"] == "stage_updated"
    assert event["stage"] == "Interviewing"
    assert "body" not in event


async def test_email_events_query_scoped_by_user_id(app):  # noqa: ARG001
    """list query must not return events belonging to other users."""
    from email_integration.email_events import list_email_events_for_application

    user = await create_user("scope@example.com", "TestPass123!", "Scope User")
    user_id = str(user["_id"])
    app_id = str(ObjectId())
    other_user_id = ObjectId()

    col = database.get_collection(EMAIL_EVENTS_COLLECTION)
    now = datetime.now(timezone.utc)
    await col.insert_many([
        {
            "user_id": ObjectId(user_id),
            "type": "stage_updated",
            "timestamp": now,
            "application_id": app_id,
            "company": "Mine",
            "role_title": "Role",
            "stage": "Offer",
            "subject": "Offer letter",
        },
        {
            "user_id": other_user_id,
            "type": "stage_updated",
            "timestamp": now,
            "application_id": app_id,
            "company": "Theirs",
            "role_title": "Role",
            "stage": "Offer",
            "subject": "Other offer",
        },
    ])

    events = await list_email_events_for_application(user_id, app_id)

    assert len(events) == 1
    assert events[0]["company"] == "Mine"
