"""Tests for the weekly email digest: build_weekly_digest and send_weekly_digest."""

import datetime as dt
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from bson import ObjectId

import database
from notifications.digest import (
    STALE_APP_DAYS,
    build_weekly_digest,
    send_weekly_digest,
)
from tests.conftest import verify_user_by_id

REGISTER_PAYLOAD = {
    "email": "digest_user@example.com",
    "password": "password123",
    "display_name": "Digest User",
}


@pytest_asyncio.fixture(loop_scope="session")
async def registered_user(client):
    """Register a user and return (user_id, email)."""
    resp = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    assert resp.status_code == 201
    uid = resp.json()["data"]["id"]
    await verify_user_by_id(uid)
    return uid, REGISTER_PAYLOAD["email"]


_insert_counter = 0


async def _insert_application(user_id: str, updated_days_ago: int, created_days_ago: int = 1) -> None:
    """Insert a minimal application document with controlled timestamps."""
    global _insert_counter
    _insert_counter += 1
    col = database.get_collection("applications")
    now = dt.datetime.now(dt.timezone.utc)
    await col.insert_one({
        "user_id": ObjectId(user_id),
        "company": "Test Corp",
        "role_title": f"Engineer {_insert_counter}",
        "stage": "Applied",
        "archived": False,
        "created_at": now - dt.timedelta(days=created_days_ago),
        "updated_at": now - dt.timedelta(days=updated_days_ago),
    })


async def _insert_event(user_id: str, days_from_now: int) -> None:
    """Insert a calendar event a given number of days from today."""
    col = database.get_collection("calendar_events")
    event_date = dt.datetime.combine(
        dt.date.today() + dt.timedelta(days=days_from_now),
        dt.time.min,
        tzinfo=dt.timezone.utc,
    )
    await col.insert_one({
        "user_id": ObjectId(user_id),
        "company": "Test Corp",
        "role_title": "Engineer",
        "event_type": "technical",
        "date": event_date,
        "time": None,
    })


@pytest.mark.asyncio(loop_scope="session")
async def test_build_weekly_digest_stale_app_count(client, registered_user):
    """build_weekly_digest should include apps not updated in STALE_APP_DAYS+ days."""
    user_id, _ = registered_user

    # Arrange — one fresh, one stale
    await _insert_application(user_id, updated_days_ago=2)
    await _insert_application(user_id, updated_days_ago=STALE_APP_DAYS + 1)

    # Act
    digest = await build_weekly_digest(user_id)

    # Assert — only the stale one appears in stale_apps
    assert len(digest.stale_apps) == 1
    assert digest.stale_apps[0].days_since_update >= STALE_APP_DAYS


@pytest.mark.asyncio(loop_scope="session")
async def test_build_weekly_digest_upcoming_events(client, registered_user):
    """build_weekly_digest should include calendar events within the next 7 days."""
    user_id, _ = registered_user

    # Arrange — one upcoming (3 days), one too far away (10 days)
    await _insert_event(user_id, days_from_now=3)
    await _insert_event(user_id, days_from_now=10)

    # Act
    digest = await build_weekly_digest(user_id)

    # Assert — only the near event is included
    assert len(digest.upcoming_events) == 1


@pytest.mark.asyncio(loop_scope="session")
async def test_send_weekly_digest_calls_email_service(client, registered_user):
    """send_weekly_digest should call email_service.send_text_email with digest content."""
    user_id, email = registered_user

    # Act
    with patch(
        "notifications.digest.email_service.send_text_email",
        new_callable=AsyncMock,
    ) as mock_send:
        result = await send_weekly_digest(user_id)

    # Assert — returned True and email was sent to the correct address
    assert result is True
    mock_send.assert_called_once()
    call_args = mock_send.call_args
    assert call_args.args[0] == email
    assert "Pipelined" in call_args.args[1]
    assert "weekly" in call_args.args[2].lower() or "summary" in call_args.args[2].lower()


@pytest.mark.asyncio(loop_scope="session")
async def test_send_weekly_digest_returns_false_for_missing_user():
    """send_weekly_digest should return False and log a warning for a nonexistent user."""
    # Arrange — use a valid-format but nonexistent ObjectId
    fake_id = str(ObjectId())

    # Act
    result = await send_weekly_digest(fake_id)

    # Assert
    assert result is False
