"""Tier limit enforcement: check user's usage against their plan limits."""

import structlog
from bson import ObjectId

from config import TIER_LIMITS, UNLIMITED, settings
from database import get_collection

logger = structlog.get_logger()

RESOURCE_COLLECTION_MAP: dict[str, str] = {
    "max_applications": "applications",
    "max_contacts": "contacts",
    "max_saved_searches": "saved_searches",
}

TIER_LIMIT_EXCEEDED_MESSAGE = "Free plan limit reached. Upgrade to Pro for unlimited access."


class TierLimitExceeded(Exception):
    """Raised when a user exceeds their tier's resource limit."""

    def __init__(self, resource: str, current_count: int, max_allowed: int) -> None:
        self.resource = resource
        self.current_count = current_count
        self.max_allowed = max_allowed
        super().__init__(
            f"{resource} limit reached ({current_count}/{max_allowed})"
        )


async def _get_user_tier(user_id: str) -> str:
    """Return the user's tier, defaulting to 'free' if the lookup fails."""
    try:
        users = get_collection("users")
        doc = await users.find_one({"_id": ObjectId(user_id)}, projection={"tier": 1})
        return (doc or {}).get("tier", "free")
    except Exception:
        logger.error("tier_lookup_failed", user_id=user_id, exc_info=True)
        return "free"


async def _count_resource(user_id: str, resource: str) -> int:
    """Count current usage of a resource for a user."""
    collection_name = RESOURCE_COLLECTION_MAP.get(resource)
    if not collection_name:
        return 0
    try:
        col = get_collection(collection_name)
        uid = ObjectId(user_id)
        return await col.count_documents({"user_id": uid, "deleted": {"$ne": True}})
    except Exception:
        logger.error("resource_count_failed", user_id=user_id, resource=resource, exc_info=True)
        return 0


async def check_tier_limit(resource: str, user_id: str) -> None:
    """Check whether the user is within their tier limit for the given resource.

    Raises TierLimitExceeded if the limit is exceeded.
    Silently passes if tier limits are disabled (test mode) or limit is -1 (unlimited).
    """
    if settings.disable_tier_limits:
        return

    tier = await _get_user_tier(user_id)
    limits = TIER_LIMITS.get(tier, TIER_LIMITS["free"])
    max_allowed = limits.get(resource)

    if max_allowed is None or max_allowed == UNLIMITED:
        return

    current_count = await _count_resource(user_id, resource)
    if current_count >= max_allowed:
        logger.warning(
            "tier_limit_exceeded",
            user_id=user_id,
            tier=tier,
            resource=resource,
            current_count=current_count,
            max_allowed=max_allowed,
        )
        raise TierLimitExceeded(resource, current_count, int(max_allowed))
