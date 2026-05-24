"""Scheduled batch Gmail sync: iterates all connected users sequentially."""

import structlog
from bson import ObjectId

from database import get_collection
from email_integration.service import (
    GmailTokenExpiredError,
    GmailTokenRevokedError,
    sync_emails,
)

logger = structlog.get_logger()

SYNC_QUERY_PROJECTION = {
    "_id": 1,
    "gmail_access_token": 1,
    "gmail_refresh_token": 1,
    "gmail_token_expiry": 1,
    "gmail_auto_track": 1,
    "gmail_status_updates": 1,
    "gmail_interview_prep": 1,
}


def _to_oid(user_id: str) -> ObjectId:
    return ObjectId(user_id)


async def sync_all_users() -> dict[str, int]:
    """Scheduled job: sync Gmail for every connected user.

    Processes users sequentially to respect Gmail API rate limits.
    Returns aggregate metrics across the batch.
    """
    users_col = get_collection("users")
    users = await users_col.find(
        {"gmail_access_token": {"$exists": True, "$ne": ""}},
        SYNC_QUERY_PROJECTION,
    ).to_list(length=None)

    totals: dict[str, int] = {
        "users_processed": 0,
        "emails_processed": 0,
        "apps_created": 0,
        "apps_updated": 0,
        "errors": 0,
        "disabled": 0,
    }

    for user in users:
        user_id = str(user["_id"])
        try:
            result = await sync_emails(user)
            totals["users_processed"] += 1
            totals["emails_processed"] += result["emails_processed"]
            totals["apps_created"] += result["apps_created"]
            totals["apps_updated"] += result["apps_updated"]
        except (GmailTokenRevokedError, GmailTokenExpiredError) as exc:
            await _disable_gmail(user_id, reason=type(exc).__name__)
            totals["disabled"] += 1
            logger.warning("gmail_sync_disabled", user_id=user_id, reason=str(exc))
        except Exception as exc:
            totals["errors"] += 1
            logger.error("gmail_sync_user_error", user_id=user_id, error=str(exc))

    logger.info("gmail_batch_sync_complete", **totals)
    return totals


async def _disable_gmail(user_id: str, reason: str) -> None:
    """Clear all gmail_* credential fields without attempting token revocation."""
    await get_collection("users").update_one(
        {"_id": _to_oid(user_id)},
        {
            "$unset": {k: "" for k in (
                "gmail_access_token",
                "gmail_refresh_token",
                "gmail_token_expiry",
                "gmail_email",
                "gmail_connected_at",
                "gmail_last_sync_at",
                "gmail_emails_scanned",
                "gmail_apps_tracked",
                "gmail_status_updates_count",
            )}
        },
    )
    logger.info("gmail_credentials_cleared", user_id=user_id, reason=reason)
