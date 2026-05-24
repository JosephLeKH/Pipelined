"""Tests for email_integration.service module."""

import pytest
from bson import ObjectId

import database
from auth.service import create_user
from email_integration.service import (
    STAGE_MAP,
    STAGE_ORDER,
    _find_existing_app,
    get_connection_status,
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
async def test_find_existing_app_no_match(app):
    """Should return None when no application matches the query."""
    user = await create_user("find@example.com", "TestPass123!", "Find User")
    user_id = str(user["_id"])

    result = await _find_existing_app(user_id, "NonexistentCo", "SWE")

    assert result is None


@pytest.mark.asyncio(loop_scope="session")
async def test_find_existing_app_matches_case_insensitively(app):
    """Should find application with case-insensitive company name match."""
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
