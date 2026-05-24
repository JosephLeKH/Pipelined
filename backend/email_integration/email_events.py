"""Privacy-safe email event persistence for classified Gmail messages."""

from datetime import datetime, timezone

import structlog
from bson import ObjectId
from bson.errors import InvalidId

from database import get_collection

logger = structlog.get_logger()

EMAIL_EVENTS_COLLECTION = "email_events"
MAX_SUBJECT_LENGTH = 200


def _to_oid(value: str) -> ObjectId:
    return ObjectId(value)


async def log_email_event(
    user_id: str,
    *,
    event_type: str,
    application_id: str | None,
    company: str,
    role_title: str | None,
    stage: str,
    subject: str,
) -> None:
    """Persist a classified email event without storing the email body."""
    doc: dict = {
        "user_id": _to_oid(user_id),
        "type": event_type,
        "timestamp": datetime.now(timezone.utc),
        "application_id": application_id,
        "company": company,
        "role_title": role_title or None,
        "stage": stage,
        "subject": subject[:MAX_SUBJECT_LENGTH],
    }
    await get_collection(EMAIL_EVENTS_COLLECTION).insert_one(doc)
    logger.info(
        "email_event_logged",
        user_id=user_id,
        event_type=event_type,
        application_id=application_id,
        stage=stage,
    )


async def list_email_events_for_application(
    user_id: str,
    application_id: str,
) -> list[dict]:
    """Return email events for one application, scoped by user_id."""
    try:
        uid = _to_oid(user_id)
        _to_oid(application_id)
    except (ValueError, InvalidId):
        return []

    cursor = (
        get_collection(EMAIL_EVENTS_COLLECTION)
        .find({"user_id": uid, "application_id": application_id})
        .sort("timestamp", -1)
    )
    events: list[dict] = []
    async for doc in cursor:
        events.append({
            "id": str(doc["_id"]),
            "type": doc.get("type", "unknown"),
            "timestamp": doc.get("timestamp"),
            "application_id": doc.get("application_id"),
            "company": doc.get("company"),
            "role_title": doc.get("role_title"),
            "stage": doc.get("stage"),
            "subject": doc.get("subject"),
        })
    return events
