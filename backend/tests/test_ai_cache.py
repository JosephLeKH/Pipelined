"""Tests for parsing/ai_cache.py — cache hit/miss, TTL, daily quota, and budget cap."""

import json
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

pytestmark = pytest.mark.asyncio(loop_scope="session")

import database
from parsing.ai_cache import (
    CACHE_COLLECTION,
    PROVIDER_OPENROUTER,
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
    """A cache miss triggers an OpenRouter call and stores the result."""
    monkeypatch.setattr("parsing.fit_scorer.settings.openrouter_api_key", "test-key")
    monkeypatch.setattr("parsing.fit_scorer.settings.openrouter_default_model", "gpt-4o-mini")

    mock_completion = AsyncMock(
        return_value=_make_openai_response(json.dumps(VALID_FIT_PAYLOAD))
    )
    with patch("parsing.fit_scorer.chat_completion_with_fallback", mock_completion):
        from parsing.fit_scorer import score_fit
        result = await score_fit("Python engineer resume.", "Backend engineer at Google.")

    assert result["fit_score"] == 78
    mock_completion.assert_called_once()

    # Verify stored in cache
    cache_key = compute_cache_key("gpt-4o-mini", "Python engineer resume."[:500] + "" + "")
    cached = await get_cached_response(cache_key)
    assert cached is not None
    assert cached["fit_score"] == 78


async def test_cache_hit_skips_openai(app, monkeypatch):
    """A cache hit returns the stored response without calling OpenRouter."""
    monkeypatch.setattr("parsing.fit_scorer.settings.openrouter_api_key", "test-key")
    monkeypatch.setattr("parsing.fit_scorer.settings.openrouter_default_model", "gpt-4o-mini")

    cache_key = compute_cache_key("gpt-4o-mini", "unique resume for hit test"[:500])
    await store_response(cache_key, VALID_FIT_PAYLOAD, "gpt-4o-mini", 50, 100)

    mock_completion = AsyncMock()
    with patch("parsing.fit_scorer.chat_completion_with_fallback", mock_completion):
        from parsing.fit_scorer import score_fit
        result = await score_fit("unique resume for hit test", "some job description")

    assert result["fit_score"] == 78
    mock_completion.assert_not_called()


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
    monkeypatch.setattr("parsing.fit_scorer.settings.openrouter_api_key", "test-key")
    monkeypatch.setattr("parsing.fit_scorer.settings.openrouter_default_model", "gpt-4o-mini")
    monkeypatch.setattr("parsing.ai_cache.settings.openai_monthly_budget_usd", 0.0)

    mock_completion = AsyncMock()
    with patch("parsing.fit_scorer.chat_completion_with_fallback", mock_completion):
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
    mock_completion.assert_not_called()


async def test_check_budget_returns_true_when_under_limit(monkeypatch):
    """check_budget returns True when no budget doc exists (never spent)."""
    monkeypatch.setattr("parsing.ai_cache.settings.openai_monthly_budget_usd", 50.0)
    # Clean state from conftest wipe
    result = await check_budget()
    assert result is True

# ---------------------------------------------------------------------------
# OpenRouter provider quota and budget
# ---------------------------------------------------------------------------


async def test_check_budget_openrouter_returns_false_when_exceeded(app, monkeypatch):
    """check_budget(PROVIDER_OPENROUTER) returns False when monthly cap is hit."""
    from parsing.ai_cache import BUDGET_COLLECTION, PROVIDER_OPENROUTER

    monkeypatch.setattr("parsing.ai_cache.settings.openai_monthly_budget_usd", 0.0)

    if database.db is not None:
        month = datetime.now(timezone.utc).strftime("%Y-%m")
        await database.db[BUDGET_COLLECTION].update_one(
            {"month": month},
            {"$set": {"total_cost_usd": 100.0, "call_count": 50}},
            upsert=True,
        )

    result = await check_budget(PROVIDER_OPENROUTER)
    assert result is False


async def test_check_and_increment_quota_accepts_openrouter_provider(client):
    """OpenRouter provider param uses the same daily fit-score quota counter."""
    from parsing.ai_cache import PROVIDER_OPENROUTER

    user, _ = await _register_user(client, "openrouter_quota@example.com")
    user_id = user["id"]

    await check_and_increment_quota(user_id, PROVIDER_OPENROUTER)

    if database.db is not None:
        from bson import ObjectId
        doc = await database.db["users"].find_one({"_id": ObjectId(user_id)})
        assert doc["ai_usage"]["fit_scores_today"] == 1


async def test_store_response_openrouter_tracks_provider_cost(app):
    """store_response with PROVIDER_OPENROUTER increments provider_costs.openrouter."""
    from parsing.ai_cache import BUDGET_COLLECTION, PROVIDER_OPENROUTER

    cache_key = compute_cache_key("google/gemini-2.0-flash-001", "openrouter prompt", PROVIDER_OPENROUTER)
    payload = {"score": 82, "reason": "Strong match"}
    await store_response(cache_key, payload, "google/gemini-2.0-flash-001", 100, 50, PROVIDER_OPENROUTER)

    if database.db is not None:
        month = datetime.now(timezone.utc).strftime("%Y-%m")
        doc = await database.db[BUDGET_COLLECTION].find_one({"month": month})
        assert doc is not None
        assert doc.get("provider_costs", {}).get("openrouter", 0) > 0

