"""Tests for Motor client initialization and index creation."""

import pytest

from database import ensure_indexes, get_collection


@pytest.mark.asyncio
async def test_ensure_indexes_is_idempotent(app):
    # Arrange — app fixture already called connect(); just run twice to verify idempotency
    await ensure_indexes()

    # Act — second call must not raise
    await ensure_indexes()


@pytest.mark.asyncio
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


@pytest.mark.asyncio
async def test_ensure_indexes_creates_calendar_events_indexes(app):
    # Arrange
    await ensure_indexes()

    # Act
    index_info = await get_collection("calendar_events").index_information()

    # Assert
    index_names = set(index_info.keys())
    assert "user_date" in index_names
    assert "app_id" in index_names


@pytest.mark.asyncio
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


@pytest.mark.asyncio
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
