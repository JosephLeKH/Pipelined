"""MongoDB-backed response cache, per-user daily quotas, and monthly budget cap for AI calls."""

import hashlib
from datetime import datetime, timezone

import structlog
from bson import ObjectId

from config import settings
from database import get_collection

logger = structlog.get_logger()

CACHE_COLLECTION = "ai_cache"
BUDGET_COLLECTION = "ai_budget"

PROVIDER_OPENAI = "openai"
PROVIDER_OPENROUTER = "openrouter"

# gpt-4o-mini pricing (per token)
COST_PER_INPUT_TOKEN = 0.15 / 1_000_000
COST_PER_OUTPUT_TOKEN = 0.60 / 1_000_000

# OpenRouter gemini-2.0-flash pricing (per token, approximate)
OPENROUTER_COST_PER_INPUT_TOKEN = 0.10 / 1_000_000
OPENROUTER_COST_PER_OUTPUT_TOKEN = 0.40 / 1_000_000

AI_CACHE_TTL_SECONDS = 30 * 24 * 3600


class QuotaExceededError(Exception):
    """Raised when a user has exceeded their daily AI scoring quota."""

    def __init__(self, limit: int) -> None:
        self.limit = limit
        super().__init__(f"Daily AI scoring limit reached ({limit} per day). Resets at midnight UTC.")


class BudgetExceededError(Exception):
    """Raised when the monthly AI budget cap is exceeded."""


def compute_cache_key(
    model: str, prompt_fragment: str, provider: str = PROVIDER_OPENAI
) -> str:
    """Return SHA256 hex digest of model + prompt_fragment (provider-scoped for OpenRouter)."""
    if provider == PROVIDER_OPENROUTER:
        raw = provider + model + prompt_fragment
    else:
        raw = model + prompt_fragment
    return hashlib.sha256(raw.encode()).hexdigest()


def _estimate_cost(provider: str, input_tokens: int, output_tokens: int) -> float:
    if provider == PROVIDER_OPENROUTER:
        return (input_tokens * OPENROUTER_COST_PER_INPUT_TOKEN) + (
            output_tokens * OPENROUTER_COST_PER_OUTPUT_TOKEN
        )
    return (input_tokens * COST_PER_INPUT_TOKEN) + (output_tokens * COST_PER_OUTPUT_TOKEN)


async def get_cached_response(cache_key: str) -> dict | None:
    """Return the cached response dict, or None on a cache miss or DB unavailable."""
    try:
        cache = get_collection(CACHE_COLLECTION)
        doc = await cache.find_one({"cache_key": cache_key})
    except RuntimeError:
        return None
    if doc:
        logger.info("ai_cache_hit", cache_key=cache_key[:16], provider=doc.get("provider"))
        return doc["response"]
    return None


async def store_response(
    cache_key: str,
    response: dict,
    model: str,
    input_tokens: int,
    output_tokens: int,
    provider: str = PROVIDER_OPENAI,
) -> None:
    """Upsert response into the cache and charge the shared monthly budget."""
    cost = _estimate_cost(provider, input_tokens, output_tokens)
    try:
        cache = get_collection(CACHE_COLLECTION)
        await cache.update_one(
            {"cache_key": cache_key},
            {
                "$set": {
                    "cache_key": cache_key,
                    "response": response,
                    "model": model,
                    "provider": provider,
                    "estimated_cost_usd": cost,
                    "created_at": datetime.now(timezone.utc),
                }
            },
            upsert=True,
        )
    except RuntimeError:
        return
    await _increment_budget(cost, provider)


async def _increment_budget(cost: float, provider: str) -> None:
    """Increment the current month's shared budget record by cost."""
    month = datetime.now(timezone.utc).strftime("%Y-%m")
    try:
        budget = get_collection(BUDGET_COLLECTION)
        await budget.update_one(
            {"month": month},
            {
                "$inc": {
                    "total_cost_usd": cost,
                    "call_count": 1,
                    f"provider_costs.{provider}": cost,
                }
            },
            upsert=True,
        )
    except RuntimeError:
        return


async def check_budget(provider: str = PROVIDER_OPENAI) -> bool:
    """Return True if the shared monthly budget allows another call."""
    month = datetime.now(timezone.utc).strftime("%Y-%m")
    try:
        budget = get_collection(BUDGET_COLLECTION)
        doc = await budget.find_one({"month": month})
    except RuntimeError:
        return True
    if doc and doc.get("total_cost_usd", 0.0) >= settings.openai_monthly_budget_usd:
        logger.critical(
            "ai_monthly_budget_exceeded",
            month=month,
            provider=provider,
            total_cost_usd=doc["total_cost_usd"],
            limit_usd=settings.openai_monthly_budget_usd,
        )
        return False
    return True


async def check_and_increment_quota(
    user_id: str, provider: str = PROVIDER_OPENAI
) -> None:
    """Check and increment the user's daily fit-score quota atomically."""
    _ = provider
    today = datetime.now(timezone.utc).date().isoformat()
    limit = settings.ai_fit_scores_daily_limit
    try:
        users = get_collection("users")
        oid = ObjectId(user_id)
    except RuntimeError:
        return

    await users.update_one(
        {"_id": oid, "ai_usage.last_reset_date": {"$ne": today}},
        {"$set": {"ai_usage.last_reset_date": today, "ai_usage.fit_scores_today": 0}},
    )

    result = await users.find_one_and_update(
        {"_id": oid, "ai_usage.fit_scores_today": {"$lt": limit}},
        {"$inc": {"ai_usage.fit_scores_today": 1}},
    )
    if result is None:
        raise QuotaExceededError(limit)


def get_ai_scores_remaining(user: dict) -> int:
    """Return how many fit-score calls the user has left today."""
    today = datetime.now(timezone.utc).date().isoformat()
    ai_usage = user.get("ai_usage") or {}
    if ai_usage.get("last_reset_date") != today:
        return settings.ai_fit_scores_daily_limit
    used = ai_usage.get("fit_scores_today", 0)
    return max(0, settings.ai_fit_scores_daily_limit - used)
