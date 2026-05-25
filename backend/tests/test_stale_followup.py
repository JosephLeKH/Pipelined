"""Tests for applications/service_stale.py — auto-draft follow-up for stale apps."""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
from bson import ObjectId

import database
from applications.service_stale import STALE_APP_DAYS, auto_draft_stale_followups

pytestmark = pytest.mark.asyncio(loop_scope="session")

_MOCK_DRAFT = {"subject": "Following up on my application", "body": "Hello, I wanted to follow up..."}


def _stale_updated_at() -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=STALE_APP_DAYS + 1)


async def test_returns_zero_when_no_stale_apps(test_user):
    """No qualifying apps — function returns 0 without calling the LLM."""
    user_id = test_user[0]["id"]

    result = await auto_draft_stale_followups(user_id)

    assert result == 0


async def test_skips_apps_with_existing_follow_up_draft(test_user):
    """App already has follow_up_draft set — function skips it and returns 0."""
    user_id_obj = ObjectId(test_user[0]["id"])
    apps_col = database.get_collection("applications")
    await apps_col.insert_one({
        "user_id": user_id_obj,
        "company": "Already Drafted Corp",
        "role_title": "Engineer",
        "current_stage": "Applied",
        "updated_at": _stale_updated_at(),
        "follow_up_draft": {"subject": "existing", "body": "already exists"},
    })

    with patch(
        "applications.service_stale.generate_follow_up_draft",
        new_callable=AsyncMock,
    ) as mock_gen:
        result = await auto_draft_stale_followups(str(user_id_obj))

    assert result == 0
    mock_gen.assert_not_called()


async def test_skips_apps_in_non_qualifying_stages(test_user):
    """App in 'Onsite' stage (beyond Phone Screen) — function skips it and returns 0."""
    user_id_obj = ObjectId(test_user[0]["id"])
    apps_col = database.get_collection("applications")
    await apps_col.insert_one({
        "user_id": user_id_obj,
        "company": "Late Stage Corp",
        "role_title": "Staff Engineer",
        "current_stage": "Onsite",
        "updated_at": _stale_updated_at(),
        "follow_up_draft": None,
    })

    with patch(
        "applications.service_stale.generate_follow_up_draft",
        new_callable=AsyncMock,
    ) as mock_gen:
        result = await auto_draft_stale_followups(str(user_id_obj))

    assert result == 0
    mock_gen.assert_not_called()


async def test_generates_and_saves_draft_for_qualifying_app(test_user):
    """Qualifying stale app — generates draft, saves it, and creates notification."""
    user_id_obj = ObjectId(test_user[0]["id"])
    apps_col = database.get_collection("applications")
    insert_result = await apps_col.insert_one({
        "user_id": user_id_obj,
        "company": "Stale Inc",
        "role_title": "Backend Engineer",
        "current_stage": "Applied",
        "updated_at": _stale_updated_at(),
        "follow_up_draft": None,
    })
    app_id = insert_result.inserted_id

    with patch(
        "applications.service_stale.generate_follow_up_draft",
        new_callable=AsyncMock,
        return_value=_MOCK_DRAFT,
    ):
        result = await auto_draft_stale_followups(str(user_id_obj))

    assert result == 1

    updated_app = await apps_col.find_one({"_id": app_id})
    assert updated_app is not None
    assert updated_app["follow_up_draft"] == _MOCK_DRAFT
    assert updated_app["follow_up_draft_generated_at"] is not None

    notif_col = database.get_collection("notifications")
    notification = await notif_col.find_one({
        "user_id": user_id_obj,
        "type": "follow_up_due",
        "action_url": {"$regex": str(app_id)},
    })
    assert notification is not None
    assert notification["title"] == "Follow-up draft ready"
    assert "Stale Inc" in notification["body"]
