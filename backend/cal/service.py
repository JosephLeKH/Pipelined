"""Calendar event CRUD with application join for company/role_title enrichment."""

import datetime as dt

import structlog
from bson import ObjectId

from cal.schemas import EventCreate, EventUpdate
from database import get_collection

logger = structlog.get_logger()

DEFAULT_DATE_FROM_DAY = 1
MAX_CALENDAR_EVENTS = 500
MAX_DATE_RANGE_DAYS = 366


class EventNotFoundError(Exception):
    """Raised when a calendar event does not exist for this user."""


class ApplicationNotFoundError(Exception):
    """Raised when the linked application does not exist for this user."""


async def create_event(user_id: str, body: EventCreate) -> dict:
    """Create a calendar event. Raises ApplicationNotFoundError if app_id not owned by user."""
    uid = ObjectId(user_id)
    aid = ObjectId(body.application_id)

    apps = get_collection("applications")
    app_doc = await apps.find_one(
        {"_id": aid, "user_id": uid},
        projection={"company": 1, "role_title": 1},
    )
    if app_doc is None:
        raise ApplicationNotFoundError

    events = get_collection("calendar_events")
    doc: dict = {
        "user_id": uid,
        "application_id": aid,
        "event_type": body.event_type,
        "date": body.date,
        "time": body.time,
        "notes": body.notes,
        "title": body.title,
    }
    result = await events.insert_one(doc)
    doc["_id"] = result.inserted_id
    doc["company"] = app_doc.get("company")
    doc["role_title"] = app_doc.get("role_title")

    logger.info("calendar_event_created", user_id=user_id, event_id=str(result.inserted_id))
    return doc


async def list_events(
    user_id: str,
    date_from: dt.date | None,
    date_to: dt.date | None,
    application_id: str | None = None,
) -> list[dict]:
    """Return events for user, optionally filtered by application_id or date range.

    When application_id is provided, returns all events for that application (no date
    restriction). Otherwise defaults to the current calendar month.
    """
    uid = ObjectId(user_id)

    match_filter: dict = {"user_id": uid}

    if application_id:
        match_filter["application_id"] = ObjectId(application_id)
    else:
        today = dt.date.today()
        effective_from = date_from or today.replace(day=DEFAULT_DATE_FROM_DAY)
        effective_to = date_to or today.replace(
            day=1,
            month=today.month % 12 + 1,
            year=today.year + today.month // 12,
        ) - dt.timedelta(days=1)
        match_filter["date"] = {"$gte": effective_from, "$lte": effective_to}

    pipeline = [
        {"$match": match_filter},
        {
            "$lookup": {
                "from": "applications",
                "localField": "application_id",
                "foreignField": "_id",
                "as": "_app",
                "pipeline": [{"$project": {"company": 1, "role_title": 1}}],
            }
        },
        {"$addFields": {
            "company": {"$arrayElemAt": ["$_app.company", 0]},
            "role_title": {"$arrayElemAt": ["$_app.role_title", 0]},
        }},
        {"$project": {"_app": 0}},
        {"$sort": {"date": 1, "_id": 1}},
    ]

    events = get_collection("calendar_events")
    return await events.aggregate(pipeline).to_list(length=MAX_CALENDAR_EVENTS)


async def update_event(user_id: str, event_id: str, updates: EventUpdate) -> dict | None:
    """Apply partial updates to an event. Returns updated doc or None if not found."""
    from pymongo import ReturnDocument

    uid = ObjectId(user_id)
    eid = ObjectId(event_id)
    events = get_collection("calendar_events")

    set_fields = {k: v for k, v in updates.model_dump(exclude_none=True).items()}
    if not set_fields:
        # Nothing to update — fetch and return current doc enriched with app data
        return await _get_enriched(uid, eid)

    result = await events.find_one_and_update(
        {"_id": eid, "user_id": uid},
        {"$set": set_fields},
        return_document=ReturnDocument.AFTER,
    )
    if result is None:
        return None

    logger.info("calendar_event_updated", user_id=user_id, event_id=event_id)
    return await _get_enriched(uid, eid)


async def delete_event(user_id: str, event_id: str) -> bool:
    """Delete a calendar event. Returns True if deleted."""
    uid = ObjectId(user_id)
    eid = ObjectId(event_id)
    events = get_collection("calendar_events")

    result = await events.delete_one({"_id": eid, "user_id": uid})
    if result.deleted_count == 0:
        return False

    logger.info("calendar_event_deleted", user_id=user_id, event_id=event_id)
    return True


async def _get_enriched(uid: ObjectId, eid: ObjectId) -> dict | None:
    """Fetch a single event joined with its application's company/role_title."""
    pipeline = [
        {"$match": {"_id": eid, "user_id": uid}},
        {
            "$lookup": {
                "from": "applications",
                "localField": "application_id",
                "foreignField": "_id",
                "as": "_app",
                "pipeline": [{"$project": {"company": 1, "role_title": 1}}],
            }
        },
        {"$addFields": {
            "company": {"$arrayElemAt": ["$_app.company", 0]},
            "role_title": {"$arrayElemAt": ["$_app.role_title", 0]},
        }},
        {"$project": {"_app": 0}},
    ]
    events = get_collection("calendar_events")
    docs = await events.aggregate(pipeline).to_list(length=1)
    return docs[0] if docs else None
