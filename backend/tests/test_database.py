"""Tests for Motor client initialization and index creation."""

import pytest

from database import ensure_indexes, get_collection

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_ensure_indexes_is_idempotent(app):
    # Arrange — app fixture already called connect(); just run twice to verify idempotency
    await ensure_indexes()

    # Act — second call must not raise
    await ensure_indexes()


async def test_ensure_indexes_creates_applications_indexes(app):
    # Arrange
    await ensure_indexes()

    # Act
    index_info = await get_collection("applications").index_information()

    # Assert
    index_names = set(index_info.keys())
    assert "user_date" in index_names
    assert "duplicate_guard" in index_names
    assert "user_updated" in index_names
    assert index_info["duplicate_guard"].get("unique") is True


async def test_ensure_indexes_creates_calendar_events_indexes(app):
    # Arrange
    await ensure_indexes()

    # Act
    index_info = await get_collection("calendar_events").index_information()

    # Assert
    index_names = set(index_info.keys())
    assert "user_date" in index_names
    assert "app_id" in index_names


async def test_ensure_indexes_creates_job_listings_indexes(app):
    # Arrange
    await ensure_indexes()

    # Act
    index_info = await get_collection("job_listings").index_information()

    # Assert
    index_names = set(index_info.keys())
    assert "url_dedup" in index_names
    assert "stale_date" in index_names
    assert "filters" in index_names
    assert index_info["url_dedup"].get("unique") is True


async def test_ensure_indexes_creates_users_indexes(app):
    # Arrange
    await ensure_indexes()

    # Act
    index_info = await get_collection("users").index_information()

    # Assert
    index_names = set(index_info.keys())
    assert "email" in index_names
    assert "google_id" in index_names
    assert index_info["email"].get("unique") is True
    assert index_info["google_id"].get("sparse") is True
    assert index_info["google_id"].get("unique") is True


async def test_ensure_indexes_creates_pending_opportunities_indexes(app):
    await ensure_indexes()

    index_info = await get_collection("pending_opportunities").index_information()

    index_names = set(index_info.keys())
    assert "pending_user_status" in index_names
    assert "pending_user_listing_unique" in index_names
    assert index_info["pending_user_listing_unique"].get("unique") is True


async def test_ensure_indexes_creates_copilot_sessions_indexes(app):
    await ensure_indexes()

    index_info = await get_collection("copilot_sessions").index_information()

    index_names = set(index_info.keys())
    assert "copilot_session_user" in index_names
    assert "copilot_session_ttl" in index_names
    assert index_info["copilot_session_user"].get("unique") is True
    assert index_info["copilot_session_ttl"].get("expireAfterSeconds") == 7 * 24 * 3600


async def test_ensure_indexes_creates_agent_runs_type_date_index(app):
    await ensure_indexes()

    index_info = await get_collection("agent_runs").index_information()

    assert "agent_runs_type_date" in index_info
