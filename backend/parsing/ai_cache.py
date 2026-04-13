"""MongoDB-backed response cache, per-user daily quotas, and monthly budget cap for OpenAI calls."""

import hashlib
from datetime import datetime, timezone

import structlog
from bson import ObjectId

from config import settings
from database import get_collection

logger = structlog.get_logger()

CACHE_COLLECTION = "ai_cache"
BUDGET_COLLECTION = "ai_budget"

# gpt-4o-mini pricing (per token)
COST_PER_INPUT_TOKEN = 0.15 / 1_000_000   # $0.15 per 1M input tokens
COST_PER_OUTPUT_TOKEN = 0.60 / 1_000_000  # $0.60 per 1M output tokens

AI_CACHE_TTL_SECONDS = 30 * 24 * 3600  # 30 days


class QuotaExceededError(Exception):
    """Raised when a user has exceeded their daily AI scoring quota."""

    def __init__(self, limit: int) -> None:
        self.limit = limit
        super().__init__(f"Daily AI scoring limit reached ({limit} per day). Resets at midnight UTC.")


class BudgetExceededError(Exception):
    """Raised when the monthly OpenAI budget cap is exceeded."""


def compute_cache_key(model: str, prompt_fragment: str) -> str:
    """Return SHA256 hex digest of model + prompt_fragment."""
    raw = model + prompt_fragment
    return hashlib.sha256(raw.encode()).hexdigest()


async def get_cached_response(cache_key: str) -> dict | None:
    """Return the cached response dict, or None on a cache miss or DB unavailable."""
    try:
        cache = get_collection(CACHE_COLLECTION)
        doc = await cache.find_one({"cache_key": cache_key})
    except RuntimeError:
        return None
    if doc:
        logger.info("ai_cache_hit", cache_key=cache_key[:16])
        return doc["response"]
    return None


async def store_response(
    cache_key: str,
    response: dict,
    model: str,
    input_tokens: int,
    output_tokens: int,
) -> None:
    """Upsert response into the cache and charge the monthly budget."""
    cost = (input_tokens * COST_PER_INPUT_TOKEN) + (output_tokens * COST_PER_OUTPUT_TOKEN)
    try:
        cache = get_collection(CACHE_COLLECTION)
        await cache.update_one(
            {"cache_key": cache_key},
            {
                "$set": {
                    "cache_key": cache_key,
                    "response": response,
                    "model": model,
                    "estimated_cost_usd": cost,
                    "created_at": datetime.now(timezone.utc),
                }
            },
            upsert=True,
        )
    except RuntimeError:
        return
    await _increment_budget(cost)


async def _increment_budget(cost: float) -> None:
    """Increment the current month's budget record by cost."""
    month = datetime.now(timezone.utc).strftime("%Y-%m")
    try:
        budget = get_collection(BUDGET_COLLECTION)
        await budget.update_one(
            {"month": month},
            {"$inc": {"total_cost_usd": cost, "call_count": 1}},
            upsert=True,
        )
    except RuntimeError:
        return


async def check_budget() -> bool:
    """Return True if the monthly budget allows another call, False if exceeded."""
    month = datetime.now(timezone.utc).strftime("%Y-%m")
    try:
        budget = get_collection(BUDGET_COLLECTION)
        doc = await budget.find_one({"month": month})
    except RuntimeError:
        return True  # Allow calls when DB is unavailable (e.g., unit tests)
    if doc and doc.get("total_cost_usd", 0.0) >= settings.openai_monthly_budget_usd:
        logger.critical(
            "openai_monthly_budget_exceeded",
            month=month,
            total_cost_usd=doc["total_cost_usd"],
            limit_usd=settings.openai_monthly_budget_usd,
        )
        return False
    return True


async def check_and_increment_quota(user_id: str) -> None:
    """Check and increment the user's daily fit-score quota.

    Resets the counter when the date has changed.
    Raises QuotaExceededError if the daily limit is reached.
    Silently skips when DB is unavailable (e.g., unit tests).
    """
    today = datetime.now(timezone.utc).date().isoformat()
    try:
        users = get_collection("users")
        oid = ObjectId(user_id)
        user = await users.find_one({"_id": oid}, projection={"ai_usage": 1})
    except RuntimeError:
        return
    if user is None:
        return

    ai_usage = user.get("ai_usage") or {}
    last_reset = ai_usage.get("last_reset_date")
    fit_scores_today = ai_usage.get("fit_scores_today", 0)

    try:
        if last_reset != today:
            fit_scores_today = 0
            await users.update_one(
                {"_id": oid},
                {"$set": {"ai_usage.last_reset_date": today, "ai_usage.fit_scores_today": 0}},
            )

        if fit_scores_today >= settings.ai_fit_scores_daily_limit:
            raise QuotaExceededError(settings.ai_fit_scores_daily_limit)

        await users.update_one({"_id": oid}, {"$inc": {"ai_usage.fit_scores_today": 1}})
    except QuotaExceededError:
        raise
    except RuntimeError:
        return


def get_ai_scores_remaining(user: dict) -> int:
    """Return how many fit-score calls the user has left today."""
    today = datetime.now(timezone.utc).date().isoformat()
    ai_usage = user.get("ai_usage") or {}
    if ai_usage.get("last_reset_date") != today:
        return settings.ai_fit_scores_daily_limit
    used = ai_usage.get("fit_scores_today", 0)
    return max(0, settings.ai_fit_scores_daily_limit - used)
