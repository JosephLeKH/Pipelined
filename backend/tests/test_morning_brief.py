"""Tests for morning brief assembly and storage."""

import datetime as dt
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from bson import ObjectId

import database
from notifications.morning_brief import (
    HIGH_MATCH_THRESHOLD,
    build_morning_brief,
    generate_and_store_brief,
)
from notifications.morning_brief_scheduler import (
    is_user_due_for_brief,
    send_due_morning_briefs,
)
from tests.conftest import verify_user_by_id

REGISTER_PAYLOAD = {
    "email": "morning_brief@example.com",
    "password": "password123",
    "display_name": "Brief User",
}


@pytest_asyncio.fixture(loop_scope="session")
async def brief_user(client):
    resp = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    assert resp.status_code == 201
    uid = resp.json()["data"]["id"]
    await verify_user_by_id(uid)
    return uid


async def _insert_follow_up(user_id: str) -> None:
    col = database.get_collection("applications")
    yesterday = dt.datetime.combine(
        dt.date.today() - dt.timedelta(days=2),
        dt.time.min,
        tzinfo=dt.timezone.utc,
    )
    await col.insert_one({
        "user_id": ObjectId(user_id),
        "company": "Acme",
        "role_title": "Engineer",
        "archived": False,
        "follow_up_date": yesterday,
        "updated_at": dt.datetime.now(dt.timezone.utc),
        "created_at": dt.datetime.now(dt.timezone.utc),
    })


async def _insert_high_match(user_id: str, score: int) -> None:
    col = database.get_collection("applications")
    await col.insert_one({
        "user_id": ObjectId(user_id),
        "company": "Beta",
        "role_title": "Senior Engineer",
        "archived": False,
        "fit_score": score,
        "fit_score_reason": "Strong overlap",
        "updated_at": dt.datetime.now(dt.timezone.utc),
        "created_at": dt.datetime.now(dt.timezone.utc),
    })


@pytest.mark.asyncio(loop_scope="session")
async def test_build_morning_brief_includes_follow_ups(brief_user):
    await _insert_follow_up(brief_user)

    brief = await build_morning_brief(brief_user)

    assert len(brief.sections.follow_ups) == 1
    assert "Acme" in brief.sections.follow_ups[0].title


@pytest.mark.asyncio(loop_scope="session")
async def test_build_morning_brief_includes_high_matches(brief_user):
    await _insert_high_match(brief_user, HIGH_MATCH_THRESHOLD)

    brief = await build_morning_brief(brief_user)

    assert len(brief.sections.high_matches) == 1
    assert "Beta" in brief.sections.high_matches[0].title


@pytest.mark.asyncio(loop_scope="session")
async def test_generate_and_store_brief_upserts(brief_user):
    stored = await generate_and_store_brief(brief_user)

    assert stored is not None
    assert stored["user_id"] == ObjectId(brief_user)
    assert "summary_line" in stored

    again = await generate_and_store_brief(brief_user)
    assert again["date"] == stored["date"]


@pytest.mark.asyncio(loop_scope="session")
async def test_is_user_due_for_brief_respects_timezone_and_hour(brief_user):
    users = database.get_collection("users")
    await users.update_one(
        {"_id": ObjectId(brief_user)},
        {"$set": {"timezone": "UTC", "morning_brief_hour": 8}},
    )
    user = await users.find_one({"_id": ObjectId(brief_user)})
    due_at_8 = dt.datetime(2026, 5, 23, 8, 15, tzinfo=dt.timezone.utc)
    not_due_at_9 = dt.datetime(2026, 5, 23, 9, 15, tzinfo=dt.timezone.utc)

    assert is_user_due_for_brief(user, due_at_8)[0] is True
    assert is_user_due_for_brief(user, not_due_at_9)[0] is False


@pytest.mark.asyncio(loop_scope="session")
async def test_send_due_morning_briefs_dedupes_by_local_date(brief_user):
    users = database.get_collection("users")
    await users.update_one(
        {"_id": ObjectId(brief_user)},
        {"$set": {"timezone": "UTC", "morning_brief_hour": 8, "morning_brief_in_app": True}},
    )
    now = dt.datetime(2026, 5, 23, 8, 15, tzinfo=dt.timezone.utc)
    local_date = now.date().isoformat()
    col = database.get_collection("morning_briefs")
    await col.insert_one({
        "user_id": ObjectId(brief_user),
        "date": local_date,
        "sections": {},
        "summary_line": "existing",
        "created_at": now,
    })

    with patch("notifications.morning_brief_email.send_morning_brief_email", new_callable=AsyncMock) as mock_email:
        with patch("notifications.notification_service.create_notification", new_callable=AsyncMock) as mock_notif:
            await send_due_morning_briefs(now)

    mock_email.assert_not_called()
    mock_notif.assert_not_called()
