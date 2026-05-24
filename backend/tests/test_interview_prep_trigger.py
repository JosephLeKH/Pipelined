"""Tests for Gmail-triggered interview prep auto-generation."""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
from bson import ObjectId

import database
from auth.service import create_user
from email_integration.service import (
    INTERVIEW_PREP_STATUS_DONE,
    INTERVIEW_PREP_STATUS_GENERATING,
    _should_skip_interview_prep_retrigger,
    _trigger_interview_prep,
)

pytestmark = pytest.mark.asyncio(loop_scope="session")

MOCK_BRIEFING = {
    "company": "Acme Corp",
    "personalized": {"salary_context": "Competitive market rate."},
    "compensation": {"median_total_comp": "$180k"},
    "interview_process": {"difficulty": "Medium", "rounds": []},
    "company_intel": {"what_theyre_building": "Cloud infra."},
}


async def _mock_run_agent(*_args, **_kwargs):
    yield {"type": "done", "briefing": MOCK_BRIEFING}


async def test_interview_prep_ready_notification_created(app):  # noqa: ARG001
    """Completing auto-triggered prep creates interview_prep_ready with deep link."""
    user = await create_user("prep-notif@example.com", "TestPass123!", "Prep User")
    user_id = str(user["_id"])

    apps_col = database.get_collection("applications")
    result = await apps_col.insert_one({
        "user_id": ObjectId(user_id),
        "company": "Acme Corp",
        "role_title": "Software Engineer",
        "source": "email",
        "current_stage": "Interviewing",
    })
    app_id = str(result.inserted_id)

    with patch("email_integration.service.run_agent", side_effect=_mock_run_agent):
        await _trigger_interview_prep(user_id, app_id, "Acme Corp", "Software Engineer")

    notif_col = database.get_collection("notifications")
    notification = await notif_col.find_one({
        "user_id": ObjectId(user_id),
        "type": "interview_prep_ready",
    })
    assert notification is not None
    assert notification["action_url"] == f"/dashboard?selected={app_id}"
    assert "Acme Corp" in notification["title"]


async def test_interview_prep_sets_status_generating_then_done(app):  # noqa: ARG001
    """Auto-trigger sets interview_prep_status to done with briefing persisted."""
    user = await create_user("prep-status@example.com", "TestPass123!", "Status User")
    user_id = str(user["_id"])

    apps_col = database.get_collection("applications")
    result = await apps_col.insert_one({
        "user_id": ObjectId(user_id),
        "company": "Beta Inc",
        "role_title": "Backend Engineer",
        "source": "email",
        "current_stage": "Interviewing",
    })
    app_id = str(result.inserted_id)

    with patch("email_integration.service.run_agent", side_effect=_mock_run_agent):
        await _trigger_interview_prep(user_id, app_id, "Beta Inc", "Backend Engineer")

    app_doc = await apps_col.find_one({"_id": ObjectId(app_id)})
    assert app_doc is not None
    assert app_doc["interview_prep_status"] == INTERVIEW_PREP_STATUS_DONE
    assert app_doc["interview_prep_briefing"] == MOCK_BRIEFING
    assert app_doc.get("interview_prep_triggered_at") is not None


async def test_interview_prep_dedupe_skips_within_24h(app):  # noqa: ARG001
    """Should not re-trigger prep when triggered within the dedupe window."""
    user = await create_user("prep-dedup@example.com", "TestPass123!", "Dedup User")
    user_id = str(user["_id"])

    apps_col = database.get_collection("applications")
    recent = datetime.now(timezone.utc) - timedelta(hours=2)
    result = await apps_col.insert_one({
        "user_id": ObjectId(user_id),
        "company": "Gamma LLC",
        "role_title": "Data Engineer",
        "source": "email",
        "current_stage": "Interviewing",
        "interview_prep_status": INTERVIEW_PREP_STATUS_DONE,
        "interview_prep_triggered_at": recent,
    })
    app_id = str(result.inserted_id)

    with patch("email_integration.service.run_agent", new_callable=AsyncMock) as mock_agent:
        await _trigger_interview_prep(user_id, app_id, "Gamma LLC", "Data Engineer")

    mock_agent.assert_not_called()
    assert await _should_skip_interview_prep_retrigger(user_id, app_id) is True


async def test_interview_prep_integration_invite_to_notification(app):  # noqa: ARG001
    """End-to-end: interview invite trigger persists briefing and notification."""
    user = await create_user("prep-flow@example.com", "TestPass123!", "Flow User")
    user_id = str(user["_id"])

    apps_col = database.get_collection("applications")
    result = await apps_col.insert_one({
        "user_id": ObjectId(user_id),
        "company": "Delta Co",
        "role_title": "Product Manager",
        "source": "email",
        "current_stage": "Interviewing",
    })
    app_id = str(result.inserted_id)

    with patch("email_integration.service.run_agent", side_effect=_mock_run_agent):
        await _trigger_interview_prep(user_id, app_id, "Delta Co", "Product Manager")

    app_doc = await apps_col.find_one({"_id": ObjectId(app_id)})
    notif_col = database.get_collection("notifications")
    notification = await notif_col.find_one({
        "user_id": ObjectId(user_id),
        "type": "interview_prep_ready",
        "action_url": f"/dashboard?selected={app_id}",
    })

    assert app_doc["interview_prep_status"] == INTERVIEW_PREP_STATUS_DONE
    assert app_doc["interview_prep_briefing"]["company"] == "Acme Corp"
    assert notification is not None
    assert "Delta Co" in notification["title"]


async def test_interview_prep_skips_when_already_generating(app):  # noqa: ARG001
    """Should skip re-trigger when status is already generating."""
    user = await create_user("prep-gen@example.com", "TestPass123!", "Gen User")
    user_id = str(user["_id"])

    apps_col = database.get_collection("applications")
    result = await apps_col.insert_one({
        "user_id": ObjectId(user_id),
        "company": "Epsilon",
        "role_title": "Designer",
        "source": "email",
        "current_stage": "Interviewing",
        "interview_prep_status": INTERVIEW_PREP_STATUS_GENERATING,
        "interview_prep_triggered_at": datetime.now(timezone.utc),
    })
    app_id = str(result.inserted_id)

    with patch("email_integration.service.run_agent", new_callable=AsyncMock) as mock_agent:
        await _trigger_interview_prep(user_id, app_id, "Epsilon", "Designer")

    mock_agent.assert_not_called()
