"""Tests for middleware/tier_check.py: tier limit enforcement."""

import pytest

import database
from middleware.tier_check import TierLimitExceeded, check_tier_limit

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def _create_user(client, email: str) -> str:
    """Register a user and return their ID."""
    resp = await client.post("/api/auth/register", json={
        "email": email,
        "password": "TestPass123!",
        "display_name": "Tier Test",
    })
    return resp.json()["data"]["id"]


async def test_check_tier_limit_passes_when_under_limit(client, monkeypatch):
    """check_tier_limit does not raise when current usage is below the limit."""
    monkeypatch.setattr("middleware.tier_check.settings.disable_tier_limits", False)

    user_id = await _create_user(client, "under_limit@example.com")

    # No applications exist, limit is 100 — should pass silently
    await check_tier_limit("max_applications", user_id)


async def test_check_tier_limit_raises_when_at_limit(client, monkeypatch):
    """check_tier_limit raises TierLimitExceeded when usage equals the limit."""
    monkeypatch.setattr("middleware.tier_check.settings.disable_tier_limits", False)

    user_id = await _create_user(client, "at_limit@example.com")

    # Seed applications directly in DB to simulate hitting the limit
    from bson import ObjectId
    if database.db is not None:
        uid = ObjectId(user_id)
        apps = [{"user_id": uid, "company": f"Co{i}", "role_title": "SWE"} for i in range(5)]
        await database.db["applications"].insert_many(apps)

    # Patch free limit to 5 for this test
    from config import FREE_TIER_LIMITS
    original = FREE_TIER_LIMITS.copy()
    FREE_TIER_LIMITS["max_applications"] = 5

    try:
        with pytest.raises(TierLimitExceeded) as exc_info:
            await check_tier_limit("max_applications", user_id)

        assert exc_info.value.resource == "max_applications"
        assert exc_info.value.current_count == 5
        assert exc_info.value.max_allowed == 5
    finally:
        FREE_TIER_LIMITS.update(original)


async def test_check_tier_limit_skipped_when_disabled(client, monkeypatch):
    """check_tier_limit is a no-op when disable_tier_limits=True."""
    monkeypatch.setattr("middleware.tier_check.settings.disable_tier_limits", True)

    user_id = await _create_user(client, "disabled@example.com")

    # Even if usage exceeded, should not raise
    from config import FREE_TIER_LIMITS
    original = FREE_TIER_LIMITS.copy()
    FREE_TIER_LIMITS["max_applications"] = 0
    try:
        await check_tier_limit("max_applications", user_id)  # should not raise
    finally:
        FREE_TIER_LIMITS.update(original)


async def test_api_returns_403_on_tier_limit(client, monkeypatch):
    """POST /api/applications returns 403 with TIER_LIMIT_EXCEEDED when at limit."""
    monkeypatch.setattr("middleware.tier_check.settings.disable_tier_limits", False)

    from bson import ObjectId
    resp = await client.post("/api/auth/register", json={
        "email": "api_limit@example.com",
        "password": "TestPass123!",
        "display_name": "API Limit Test",
    })
    user = resp.json()["data"]
    cookies = dict(resp.cookies)

    # Verify email
    if database.db is not None:
        await database.db["users"].update_one(
            {"_id": ObjectId(user["id"])},
            {"$set": {"email_verified": True}},
        )

    # Seed applications to hit the limit
    from config import FREE_TIER_LIMITS
    original = FREE_TIER_LIMITS.copy()
    FREE_TIER_LIMITS["max_applications"] = 2

    if database.db is not None:
        uid = ObjectId(user["id"])
        await database.db["applications"].insert_many([
            {"user_id": uid, "company": "Co1", "role_title": "SWE"},
            {"user_id": uid, "company": "Co2", "role_title": "SWE"},
        ])

    try:
        response = await client.post(
            "/api/applications",
            json={"company": "Co3", "role_title": "SWE", "source": "manual"},
            cookies=cookies,
        )
    finally:
        FREE_TIER_LIMITS.update(original)

    assert response.status_code == 403
    error = response.json()
    assert error["detail"]["code"] == "TIER_LIMIT_EXCEEDED"
