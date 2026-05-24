"""Persist agent run records to the agent_runs collection."""

from datetime import datetime, timezone

import structlog
from bson import ObjectId

from database import get_collection

logger = structlog.get_logger()

AGENT_TYPE_PREP = "prep"
AGENT_TYPE_FIT = "fit"
AGENT_TYPE_AUTOPILOT = "autopilot"
AGENT_TYPE_CLASSIFY = "classify"
AGENT_TYPE_BRIEF = "brief"
AGENT_TYPE_REVIEW = "review"
AGENT_TYPE_FOLLOWUP = "follow_up"

STATUS_SUCCESS = "success"
STATUS_FAILED = "failed"
STATUS_SKIPPED = "skipped"

COLLECTION_NAME = "agent_runs"


async def log_agent_run(
    user_id: str,
    agent_type: str,
    status: str,
    summary: str,
    *,
    application_id: str | None = None,
) -> None:
    """Insert an agent run record scoped to user_id."""
    doc: dict = {
        "user_id": ObjectId(user_id),
        "agent_type": agent_type,
        "status": status,
        "summary": summary[:500],
        "created_at": datetime.now(timezone.utc),
    }
    if application_id:
        doc["application_id"] = ObjectId(application_id)

    try:
        await get_collection(COLLECTION_NAME).insert_one(doc)
    except Exception:
        logger.warning(
            "agent_run_log_failed",
            user_id=user_id,
            agent_type=agent_type,
            exc_info=True,
        )
