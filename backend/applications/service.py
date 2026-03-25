"""Application CRUD, duplicate guard, and stage transition logic."""

from datetime import datetime, timezone

import structlog
from bson import ObjectId
from pymongo import ReturnDocument

from applications.schemas import ApplicationCreate, ApplicationListQuery, ApplicationUpdate
from auth.service import get_user_by_id
from database import get_client, get_collection

logger = structlog.get_logger()

INITIAL_STAGE = "Applied"
INACTIVE_STAGES = ["Rejected", "Offer"]

LIST_PROJECTION = {
    "role_title": 1,
    "company": 1,
    "current_stage": 1,
    "date_applied": 1,
    "source": 1,
    "updated_at": 1,
    "tags": 1,
}


class DuplicateApplicationError(Exception):
    """Raised when (user_id, company, role_title) already exists for this user."""

    def __init__(self, existing_id: str) -> None:
        self.existing_id = existing_id


class ApplicationNotFoundError(Exception):
    """Raised when a requested application does not exist for this user."""


class ActiveStageError(Exception):
    """Raised when attempting to remove the currently active stage."""


async def _fetch_user_stages(uid: ObjectId) -> list[str]:
    """Return the user's default_stages, falling back to [INITIAL_STAGE]."""
    user = await get_user_by_id(str(uid))
    return user.get("default_stages", [INITIAL_STAGE]) if user else [INITIAL_STAGE]


def _build_filter(uid: ObjectId, query: ApplicationListQuery) -> dict:
    """Build a MongoDB filter dict from query params, always scoped by user_id."""
    f: dict = {"user_id": uid}

    if query.stage:
        f["current_stage"] = query.stage
    if query.company_type:
        f["company_type"] = query.company_type
    if query.remote_status:
        f["remote_status"] = query.remote_status
    if query.tags:
        f["tags"] = {"$all": query.tags}
    if query.date_from or query.date_to:
        date_range: dict = {}
        if query.date_from:
            date_range["$gte"] = query.date_from
        if query.date_to:
            date_range["$lte"] = query.date_to
        f["date_applied"] = date_range
    if query.cursor:
        sort_order = 1 if query.sort_order == "asc" else -1
        cursor_id = ObjectId(query.cursor)
        f["_id"] = {"$lt": cursor_id} if sort_order == -1 else {"$gt": cursor_id}

    return f


async def create(user_id: str, body: ApplicationCreate) -> dict:
    """Create a new application. Raises DuplicateApplicationError on (user_id, company, role_title) collision."""
    uid = ObjectId(user_id)
    apps = get_collection("applications")

    existing = await apps.find_one(
        {"user_id": uid, "company": body.company, "role_title": body.role_title},
        projection={"_id": 1},
    )
    if existing:
        raise DuplicateApplicationError(str(existing["_id"]))

    stages = await _fetch_user_stages(uid)
    now = datetime.now(timezone.utc)

    body_dict = body.model_dump()
    body_dict["source_url"] = str(body.source_url) if body.source_url else None

    doc: dict = {
        **body_dict,
        "user_id": uid,
        "current_stage": INITIAL_STAGE,
        "stages": stages,
        "stage_history": [{"stage": INITIAL_STAGE, "transitioned_at": now}],
        "date_applied": body_dict.get("date_applied") or now,
        "created_at": now,
        "updated_at": now,
    }

    result = await apps.insert_one(doc)
    doc["_id"] = result.inserted_id
    logger.info("application_created", user_id=user_id, app_id=str(result.inserted_id))
    return doc


async def list_applications(
    user_id: str, query: ApplicationListQuery
) -> tuple[list[dict], str | None]:
    """Return (docs, next_cursor) using cursor-based pagination (no skip)."""
    uid = ObjectId(user_id)
    apps = get_collection("applications")
    sort_order = 1 if query.sort_order == "asc" else -1
    mongo_filter = _build_filter(uid, query)

    docs = await (
        apps.find(mongo_filter, projection=LIST_PROJECTION)
        .sort([(query.sort_by, sort_order), ("_id", sort_order)])
        .limit(query.limit + 1)
        .to_list(length=query.limit + 1)
    )

    has_next = len(docs) > query.limit
    if has_next:
        docs = docs[: query.limit]

    next_cursor = str(docs[-1]["_id"]) if has_next and docs else None
    return docs, next_cursor


async def get(user_id: str, app_id: str) -> dict | None:
    """Return the full application document, or None if not found."""
    return await get_collection("applications").find_one(
        {"_id": ObjectId(app_id), "user_id": ObjectId(user_id)}
    )


async def update(user_id: str, app_id: str, updates: ApplicationUpdate) -> dict | None:
    """Apply partial updates. Appends stage_history entry when current_stage changes."""
    uid = ObjectId(user_id)
    aid = ObjectId(app_id)
    apps = get_collection("applications")
    now = datetime.now(timezone.utc)

    set_fields = {k: v for k, v in updates.model_dump(exclude_none=True).items()}
    if "source_url" in set_fields:
        set_fields["source_url"] = str(set_fields["source_url"])
    set_fields["updated_at"] = now

    update_doc: dict = {"$set": set_fields}
    if "current_stage" in set_fields:
        update_doc["$push"] = {
            "stage_history": {"stage": set_fields["current_stage"], "transitioned_at": now}
        }

    result = await apps.find_one_and_update(
        {"_id": aid, "user_id": uid},
        update_doc,
        return_document=ReturnDocument.AFTER,
    )
    if result:
        logger.info("application_updated", user_id=user_id, app_id=app_id)
    return result


async def delete(user_id: str, app_id: str) -> bool:
    """Delete application and linked calendar_events in a transaction. Returns True if deleted."""
    uid = ObjectId(user_id)
    aid = ObjectId(app_id)
    db_client = get_client()
    apps = get_collection("applications")
    events = get_collection("calendar_events")

    async with await db_client.start_session() as session:
        async with session.start_transaction():
            result = await apps.delete_one(
                {"_id": aid, "user_id": uid}, session=session
            )
            if result.deleted_count == 0:
                return False
            await events.delete_many(
                {"application_id": aid, "user_id": uid}, session=session
            )

    logger.info("application_deleted", user_id=user_id, app_id=app_id)
    return True


async def add_stage(user_id: str, app_id: str, name: str, position: int) -> list[str] | None:
    """Insert a stage at the given position. Returns updated stages list, or None if not found."""
    uid = ObjectId(user_id)
    aid = ObjectId(app_id)
    apps = get_collection("applications")
    result = await apps.find_one_and_update(
        {"_id": aid, "user_id": uid},
        {"$push": {"stages": {"$each": [name], "$position": position}}},
        return_document=ReturnDocument.AFTER,
        projection={"stages": 1},
    )
    if result is None:
        return None
    logger.info("stage_added", user_id=user_id, app_id=app_id, stage=name)
    return result["stages"]


async def remove_stage(user_id: str, app_id: str, name: str) -> list[str] | None:
    """Remove a stage by name. Raises ActiveStageError if it is the current stage. Returns updated list."""
    uid = ObjectId(user_id)
    aid = ObjectId(app_id)
    apps = get_collection("applications")
    doc = await apps.find_one({"_id": aid, "user_id": uid}, projection={"current_stage": 1, "stages": 1})
    if doc is None:
        return None
    if doc.get("current_stage") == name:
        raise ActiveStageError
    result = await apps.find_one_and_update(
        {"_id": aid, "user_id": uid},
        {"$pull": {"stages": name}},
        return_document=ReturnDocument.AFTER,
        projection={"stages": 1},
    )
    if result is None:
        return None
    logger.info("stage_removed", user_id=user_id, app_id=app_id, stage=name)
    return result["stages"]


async def compute_stats(user_id: str) -> dict:
    """Return StatsResponse fields using a single $facet aggregation."""
    uid = ObjectId(user_id)
    col = get_collection("applications")

    pipeline = [
        {"$match": {"user_id": uid}},
        {"$facet": {
            "total": [{"$count": "count"}],
            "active": [
                {"$match": {"current_stage": {"$nin": INACTIVE_STAGES}}},
                {"$count": "count"},
            ],
            "with_response": [
                {"$match": {"stage_history.1": {"$exists": True}}},
                {"$count": "count"},
            ],
            "avg_response_days": [
                {"$match": {"stage_history.1": {"$exists": True}}},
                {"$project": {
                    "days": {"$dateDiff": {
                        "startDate": {"$arrayElemAt": ["$stage_history.transitioned_at", 0]},
                        "endDate": {"$arrayElemAt": ["$stage_history.transitioned_at", 1]},
                        "unit": "day",
                    }}
                }},
                {"$group": {"_id": None, "avg": {"$avg": "$days"}}},
            ],
        }},
    ]

    raw = (await col.aggregate(pipeline).to_list(length=1))[0]
    total = raw["total"][0]["count"] if raw["total"] else 0
    active = raw["active"][0]["count"] if raw["active"] else 0
    with_response = raw["with_response"][0]["count"] if raw["with_response"] else 0
    avg_days = round(raw["avg_response_days"][0]["avg"], 1) if raw["avg_response_days"] else None

    return {
        "total_applied": total,
        "active_count": active,
        "response_rate": round(with_response / total, 2) if total > 0 else 0.0,
        "avg_days_to_first_response": avg_days,
    }
