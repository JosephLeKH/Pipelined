"""Tests for parsing/ai_cache.py — cache hit/miss, TTL, daily quota, and budget cap."""

import json
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

pytestmark = pytest.mark.asyncio(loop_scope="session")

import database
from parsing.ai_cache import (
    CACHE_COLLECTION,
    QuotaExceededError,
    check_and_increment_quota,
    check_budget,
    compute_cache_key,
    get_cached_response,
    get_ai_scores_remaining,
    store_response,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_openai_response(content: str, input_tokens: int = 50, output_tokens: int = 100) -> MagicMock:
    msg = MagicMock()
    msg.content = content
    choice = MagicMock()
    choice.message = msg
    usage = MagicMock()
    usage.prompt_tokens = input_tokens
    usage.completion_tokens = output_tokens
    resp = MagicMock()
    resp.choices = [choice]
    resp.usage = usage
    return resp


VALID_FIT_PAYLOAD = {
    "fit_score": 78,
    "matched_skills": ["Python", "FastAPI"],
    "missing_skills": ["Kubernetes"],
    "summary": "Strong backend match.",
}


async def _register_user(client, email: str = "cachetest@example.com") -> tuple[dict, dict]:
    resp = await client.post("/api/auth/register", json={
        "email": email,
        "password": "TestPass123!",
        "display_name": "Cache Test",
    })
    user = resp.json()["data"]
    cookies = dict(resp.cookies)
    # verify email
    if database.db is not None:
        from bson import ObjectId
        await database.db["users"].update_one(
            {"_id": ObjectId(user["id"])},
            {"$set": {"email_verified": True}},
        )
    return user, cookies


# ---------------------------------------------------------------------------
# Cache key
# ---------------------------------------------------------------------------


def test_compute_cache_key_is_deterministic():
    key1 = compute_cache_key("gpt-4o-mini", "hello world")
    key2 = compute_cache_key("gpt-4o-mini", "hello world")
    assert key1 == key2
    assert len(key1) == 64  # SHA256 hex


def test_compute_cache_key_differs_by_model():
    key1 = compute_cache_key("gpt-4o-mini", "prompt")
    key2 = compute_cache_key("gpt-4o", "prompt")
    assert key1 != key2


# ---------------------------------------------------------------------------
# Cache miss → calls OpenAI; cache hit → skips OpenAI
# ---------------------------------------------------------------------------


async def test_cache_miss_calls_openai(app, monkeypatch):
    """A cache miss triggers an OpenAI call and stores the result."""
    monkeypatch.setattr("parsing.fit_scorer.settings.openai_api_key", "test-key")
    monkeypatch.setattr("parsing.fit_scorer.settings.openai_model", "gpt-4o-mini")

    mock_create = AsyncMock(
        return_value=_make_openai_response(json.dumps(VALID_FIT_PAYLOAD))
    )
    with patch("parsing.fit_scorer._get_client") as mock_client_fn:
        mock_client = MagicMock()
        mock_client.chat.completions.create = mock_create
        mock_client_fn.return_value = mock_client

        from parsing.fit_scorer import score_fit
        result = await score_fit("Python engineer resume.", "Backend engineer at Google.")

    assert result["fit_score"] == 78
    mock_create.assert_called_once()

    # Verify stored in cache
    cache_key = compute_cache_key("gpt-4o-mini", "Python engineer resume."[:500] + "" + "")
    cached = await get_cached_response(cache_key)
    assert cached is not None
    assert cached["fit_score"] == 78


async def test_cache_hit_skips_openai(app, monkeypatch):
    """A cache hit returns the stored response without calling OpenAI."""
    monkeypatch.setattr("parsing.fit_scorer.settings.openai_api_key", "test-key")
    monkeypatch.setattr("parsing.fit_scorer.settings.openai_model", "gpt-4o-mini")

    cache_key = compute_cache_key("gpt-4o-mini", "unique resume for hit test"[:500])
    await store_response(cache_key, VALID_FIT_PAYLOAD, "gpt-4o-mini", 50, 100)

    mock_create = AsyncMock()
    with patch("parsing.fit_scorer._get_client") as mock_client_fn:
        mock_client = MagicMock()
        mock_client.chat.completions.create = mock_create
        mock_client_fn.return_value = mock_client

        from parsing.fit_scorer import score_fit
        result = await score_fit("unique resume for hit test", "some job description")

    assert result["fit_score"] == 78
    mock_create.assert_not_called()


# ---------------------------------------------------------------------------
# TTL expiry simulation
# ---------------------------------------------------------------------------


async def test_expired_cache_entry_treated_as_miss(app):
    """A cache document with a past created_at is deleted by TTL; simulated by deletion."""
    # Store a cache entry then manually delete it to simulate TTL expiry
    cache_key = compute_cache_key("gpt-4o-mini", "expired resume text"[:500])
    await store_response(cache_key, VALID_FIT_PAYLOAD, "gpt-4o-mini", 10, 20)

    # Simulate TTL expiry: delete the document
    if database.db is not None:
        await database.db[CACHE_COLLECTION].delete_one({"cache_key": cache_key})

    result = await get_cached_response(cache_key)
    assert result is None


# ---------------------------------------------------------------------------
# Daily quota enforcement
# ---------------------------------------------------------------------------


async def test_daily_quota_resets_on_new_day(client):
    """Quota counter resets when last_reset_date differs from today."""
    user, _ = await _register_user(client, "quota_reset@example.com")
    user_id = user["id"]

    yesterday = (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()
    if database.db is not None:
        from bson import ObjectId
        await database.db["users"].update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"ai_usage": {"last_reset_date": yesterday, "fit_scores_today": 19}}},
        )

    # Should succeed (counter reset to 0 then incremented to 1)
    await check_and_increment_quota(user_id)

    if database.db is not None:
        from bson import ObjectId
        doc = await database.db["users"].find_one({"_id": ObjectId(user_id)})
        assert doc["ai_usage"]["fit_scores_today"] == 1


async def test_daily_quota_enforcement_21st_call_raises(client, monkeypatch):
    """The 21st fit-score call raises QuotaExceededError (limit is 20)."""
    monkeypatch.setattr("parsing.ai_cache.settings.ai_fit_scores_daily_limit", 20)

    user, _ = await _register_user(client, "quota_limit@example.com")
    user_id = user["id"]

    today = datetime.now(timezone.utc).date().isoformat()
    if database.db is not None:
        from bson import ObjectId
        await database.db["users"].update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"ai_usage": {"last_reset_date": today, "fit_scores_today": 20}}},
        )

    with pytest.raises(QuotaExceededError) as exc_info:
        await check_and_increment_quota(user_id)

    assert exc_info.value.limit == 20


async def test_get_ai_scores_remaining_full_when_no_usage():
    """User with no ai_usage gets the full daily limit."""
    doc = {}
    remaining = get_ai_scores_remaining(doc)
    from config import settings
    assert remaining == settings.ai_fit_scores_daily_limit


async def test_get_ai_scores_remaining_decrements_correctly():
    """Remaining count reflects usage when last_reset_date is today."""
    today = datetime.now(timezone.utc).date().isoformat()
    doc = {"ai_usage": {"last_reset_date": today, "fit_scores_today": 5}}
    remaining = get_ai_scores_remaining(doc)
    from config import settings
    assert remaining == settings.ai_fit_scores_daily_limit - 5


# ---------------------------------------------------------------------------
# Budget cap enforcement
# ---------------------------------------------------------------------------


async def test_budget_cap_returns_none_when_exceeded(app, monkeypatch):
    """score_fit returns null values when the monthly budget is exceeded."""
    monkeypatch.setattr("parsing.fit_scorer.settings.openai_api_key", "test-key")
    monkeypatch.setattr("parsing.fit_scorer.settings.openai_model", "gpt-4o-mini")
    monkeypatch.setattr("parsing.ai_cache.settings.openai_monthly_budget_usd", 0.0)

    mock_create = AsyncMock()
    with patch("parsing.fit_scorer._get_client") as mock_client_fn:
        mock_client = MagicMock()
        mock_client.chat.completions.create = mock_create
        mock_client_fn.return_value = mock_client

        # Seed a budget record above the cap
        if database.db is not None:
            month = datetime.now(timezone.utc).strftime("%Y-%m")
            await database.db["ai_budget"].update_one(
                {"month": month},
                {"$set": {"total_cost_usd": 100.0, "call_count": 999}},
                upsert=True,
            )

        from parsing.fit_scorer import score_fit
        result = await score_fit("Budget exceeded resume.", "Any job.")

    assert result["fit_score"] is None
    mock_create.assert_not_called()


async def test_check_budget_returns_true_when_under_limit(monkeypatch):
    """check_budget returns True when no budget doc exists (never spent)."""
    monkeypatch.setattr("parsing.ai_cache.settings.openai_monthly_budget_usd", 50.0)
    # Clean state from conftest wipe
    result = await check_budget()
    assert result is True
