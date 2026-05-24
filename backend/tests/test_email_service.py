"""Tests for email_integration.service module."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from bson import ObjectId

import database
from auth.service import create_user
from email_integration.service import (
    STAGE_MAP,
    STAGE_ORDER,
    _find_existing_app,
    get_connection_status,
    sync_emails,
)


# ---------------------------------------------------------------------------
# Pure-function tests (no MongoDB required)
# ---------------------------------------------------------------------------


def test_get_connection_status_connected():
    """Should return connected=True with email and apps_tracked when token exists."""
    user = {
        "gmail_access_token": "tok",
        "gmail_email": "a@b.com",
        "gmail_apps_tracked": 5,
    }

    result = get_connection_status(user)

    assert result["connected"] is True
    assert result["email"] == "a@b.com"
    assert result["apps_tracked"] == 5


def test_get_connection_status_disconnected():
    """Should return connected=False with email=None when no access_token."""
    user = {}

    result = get_connection_status(user)

    assert result["connected"] is False
    assert result["email"] is None


def test_stage_map_covers_all_classifier_stages():
    """All keys in STAGE_MAP should map to values present in STAGE_ORDER."""
    for classifier_stage, mapped_stage in STAGE_MAP.items():
        assert mapped_stage in STAGE_ORDER, (
            f"STAGE_MAP key '{classifier_stage}' maps to '{mapped_stage}' "
            f"which is not in STAGE_ORDER"
        )


# ---------------------------------------------------------------------------
# Database tests (require live MongoDB and test fixtures)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio(loop_scope="session")
async def test_find_existing_app_returns_none_for_invalid_user_id():
    """Should return None when user_id is not a valid ObjectId."""
    result = await _find_existing_app("not-an-objectid", "Google", "SWE")

    assert result is None


@pytest.mark.asyncio(loop_scope="session")
async def test_find_existing_app_no_match(app):  # noqa: ARG001
    """Should return None when no application matches the query."""
    _ = app
    user = await create_user("find@example.com", "TestPass123!", "Find User")
    user_id = str(user["_id"])

    result = await _find_existing_app(user_id, "NonexistentCo", "SWE")

    assert result is None


@pytest.mark.asyncio(loop_scope="session")
async def test_find_existing_app_matches_case_insensitively(app):  # noqa: ARG001
    """Should find application with case-insensitive company name match."""
    _ = app
    user = await create_user("case@example.com", "TestPass123!", "Case User")
    user_id = str(user["_id"])

    apps_col = database.get_collection("applications")
    doc = {
        "user_id": ObjectId(user_id),
        "company": "Google",
        "role_title": "SWE",
        "deleted": False,
    }
    await apps_col.insert_one(doc)

    result = await _find_existing_app(user_id, "google", "SWE")

    assert result is not None
    assert result["company"] == "Google"
    assert result["role_title"] == "SWE"


# ---------------------------------------------------------------------------
# Email deduplication tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio(loop_scope="session")
async def test_sync_emails_skips_already_processed_ids(app):  # noqa: ARG001
    """Should skip messages already in gmail_processed_ids and only process new ones."""
    _ = app
    # Arrange
    user = await create_user("dedup1@example.com", "TestPass123!", "Dedup User 1")
    user_id = ObjectId(user["_id"])

    # Insert user with existing processed IDs
    users = database.get_collection("users")
    await users.update_one(
        {"_id": user_id},
        {"$set": {"gmail_processed_ids": ["msg1", "msg2"]}},
    )

    # Mock httpx.AsyncClient
    mock_list_resp = MagicMock()
    mock_list_resp.status_code = 200
    mock_list_resp.json.return_value = {"messages": [{"id": "msg1"}, {"id": "msg3"}]}

    mock_detail_resp = MagicMock()
    mock_detail_resp.status_code = 404  # skip processing msg3

    mock_client = AsyncMock()
    mock_client.__aenter__.return_value.get = AsyncMock(
        side_effect=[mock_list_resp, mock_detail_resp]
    )

    # Act
    with patch("httpx.AsyncClient", return_value=mock_client):
        with patch(
            "email_integration.service._get_valid_access_token", return_value="tok"
        ):
            result = await sync_emails(user)

    # Assert
    assert result["emails_processed"] == 1  # Only msg3 (msg1 was already processed)

    # Verify msg3 is now in processed IDs
    updated_user = await users.find_one({"_id": user_id})
    assert updated_user is not None
    assert "msg3" in updated_user.get("gmail_processed_ids", [])


@pytest.mark.asyncio(loop_scope="session")
async def test_sync_emails_adds_new_ids_to_processed(app):  # noqa: ARG001
    """Should persist new message IDs to gmail_processed_ids after sync."""
    _ = app
    # Arrange
    user = await create_user("dedup2@example.com", "TestPass123!", "Dedup User 2")
    user_id = ObjectId(user["_id"])

    # Insert user with empty processed IDs
    users = database.get_collection("users")
    await users.update_one(
        {"_id": user_id},
        {"$set": {"gmail_processed_ids": []}},
    )

    # Mock httpx.AsyncClient
    mock_list_resp = MagicMock()
    mock_list_resp.status_code = 200
    mock_list_resp.json.return_value = {"messages": [{"id": "msg_new1"}, {"id": "msg_new2"}]}

    mock_detail_resp1 = MagicMock()
    mock_detail_resp1.status_code = 404

    mock_detail_resp2 = MagicMock()
    mock_detail_resp2.status_code = 404

    mock_client = AsyncMock()
    mock_client.__aenter__.return_value.get = AsyncMock(
        side_effect=[mock_list_resp, mock_detail_resp1, mock_detail_resp2]
    )

    # Act
    with patch("httpx.AsyncClient", return_value=mock_client):
        with patch(
            "email_integration.service._get_valid_access_token", return_value="tok"
        ):
            result = await sync_emails(user)

    # Assert
    assert result["emails_processed"] == 2

    # Verify both IDs are now in processed IDs
    updated_user = await users.find_one({"_id": user_id})
    assert updated_user is not None
    processed_ids = updated_user.get("gmail_processed_ids", [])
    assert "msg_new1" in processed_ids
    assert "msg_new2" in processed_ids
