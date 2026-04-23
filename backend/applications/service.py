"""Application CRUD core: create, read, update, delete, restore, archive."""

import asyncio
from datetime import datetime, timezone

import structlog
from bson import ObjectId
from bson.errors import InvalidId
from motor.motor_asyncio import AsyncIOMotorCollection
from pymongo import ReturnDocument

from applications.schemas import ApplicationCreate, ApplicationListQuery, ApplicationUpdate
from applications.service_ai import _apply_openai_fallback, _derive_company_domain, _score_and_update
from applications.service_constants import INITIAL_STAGE, LIST_PROJECTION
from auth.service import get_user_by_id
from database import get_collection

logger = structlog.get_logger()


class DuplicateApplicationError(Exception):
    """Raised when (user_id, company, role_title) already exists for this user."""

    def __init__(self, existing_id: str) -> None:
        self.existing_id = existing_id


class ApplicationNotFoundError(Exception):
    """Raised when a requested application does not exist for this user."""


class ActiveStageError(Exception):
    """Raised when attempting to remove the currently active stage."""


class InvalidCursorError(Exception):
    """Raised when a pagination cursor cannot be parsed."""


async def fetch_user_stages(uid: ObjectId) -> list[str]:
    """Return the user's default_stages, falling back to [INITIAL_STAGE]."""
    user = await get_user_by_id(str(uid))
    return user.get("default_stages", [INITIAL_STAGE]) if user else [INITIAL_STAGE]


TEXT_SEARCH_CURSOR_SEP = ":"


def _build_filter(uid: ObjectId, query: ApplicationListQuery) -> dict:
    """Build a MongoDB filter dict from query params, always scoped by user_id."""
    f: dict = {"user_id": uid, "deleted": {"$ne": True}}
    if not query.include_archived:
        f["archived"] = {"$ne": True}
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
    if query.q:
        f["$text"] = {"$search": query.q}
    elif query.cursor:
        sort_order = 1 if query.sort_order == "asc" else -1
        try:
            cursor_id = ObjectId(query.cursor)
        except (ValueError, TypeError, InvalidId) as exc:
            raise InvalidCursorError("Invalid pagination cursor") from exc
        f["_id"] = {"$lt": cursor_id} if sort_order == -1 else {"$gt": cursor_id}
    return f


async def _list_with_text_search(
    uid: ObjectId, apps: AsyncIOMotorCollection, query: ApplicationListQuery
) -> tuple[list[dict], str | None]:
    """Aggregation pipeline for $text search with textScore + _id composite cursor."""
    mongo_filter = _build_filter(uid, query)
    pipeline: list[dict] = [
        {"$match": mongo_filter},
        {"$addFields": {"score": {"$meta": "textScore"}}},
    ]
    if query.cursor:
        try:
            score_str, id_str = query.cursor.rsplit(TEXT_SEARCH_CURSOR_SEP, 1)
            cursor_score = float(score_str)
            cursor_id = ObjectId(id_str)
        except (ValueError, TypeError, InvalidId) as exc:
            raise InvalidCursorError("Invalid pagination cursor") from exc
        pipeline.append({"$match": {"$or": [
            {"score": {"$lt": cursor_score}},
            {"score": cursor_score, "_id": {"$lt": cursor_id}},
        ]}})
    pipeline.extend([
        {"$sort": {"score": -1, "_id": -1}},
        {"$limit": query.limit + 1},
        {"$project": {**LIST_PROJECTION, "score": 1}},
    ])
    docs = await apps.aggregate(pipeline).to_list(length=query.limit + 1)
    has_next = len(docs) > query.limit
    if has_next:
        docs = docs[: query.limit]
    next_cursor = None
    if has_next and docs:
        last = docs[-1]
        next_cursor = f"{last['score']}{TEXT_SEARCH_CURSOR_SEP}{last['_id']}"
    return docs, next_cursor


def _build_application_doc(
    uid: ObjectId,
    body_dict: dict,
    normalised_company: str,
    normalised_role: str,
    stages: list[str],
    now: datetime,
    company_domain: str | None,
) -> dict:
    """Assemble the full application document for insertion."""
    return {
        **body_dict,
        "user_id": uid,
        "normalised_company": normalised_company,
        "normalised_role": normalised_role,
        "current_stage": INITIAL_STAGE,
        "stages": stages,
        "stage_history": [{"stage": INITIAL_STAGE, "transitioned_at": now}],
        "date_applied": body_dict.get("date_applied") or now,
        "created_at": now,
        "updated_at": now,
        "company_domain": company_domain,
    }


async def create(user_id: str, body: ApplicationCreate) -> dict:
    """Create a new application. Raises DuplicateApplicationError on collision.

    When source='extension' and role_title or company is missing, triggers OpenAI
    fallback parsing. If OpenAI fails, saves with whatever partial data exists.
    """
    uid = ObjectId(user_id)
    apps = get_collection("applications")
    needs_fallback = body.source == "extension" and (not body.role_title or not body.company)
    if needs_fallback:
        body = await _apply_openai_fallback(body)
    normalised_company = (body.company or "").lower()
    normalised_role = (body.role_title or "").lower()
    existing = await apps.find_one(
        {"user_id": uid, "normalised_company": normalised_company, "normalised_role": normalised_role},
        projection={"_id": 1},
    )
    if existing:
        raise DuplicateApplicationError(str(existing["_id"]))
    stages, user = await asyncio.gather(fetch_user_stages(uid), get_user_by_id(user_id))
    now = datetime.now(timezone.utc)
    body_dict = body.model_dump(exclude={"page_text"})
    body_dict["source_url"] = str(body.source_url) if body.source_url else None
    company_domain = _derive_company_domain(body_dict.get("source_url"), body.company)
    doc = _build_application_doc(uid, body_dict, normalised_company, normalised_role, stages, now, company_domain)
    result = await apps.insert_one(doc)
    doc["_id"] = result.inserted_id
    logger.info("application_created", user_id=user_id, app_id=str(result.inserted_id))
    resume_text = user.get("resume_text", "") if user else ""
    if resume_text:
        job_description = " ".join(filter(None, [body.role_title, body.company, body.page_text]))
        asyncio.create_task(
            _score_and_update(
                str(result.inserted_id), user_id, resume_text, job_description,
                role_title=body.role_title or "", company=body.company or "",
            )
        )
    return doc


async def list_applications(
    user_id: str, query: ApplicationListQuery
) -> tuple[list[dict], str | None]:
    """Return (docs, next_cursor) using cursor-based pagination (no skip)."""
    uid = ObjectId(user_id)
    apps = get_collection("applications")
    if query.q:
        return await _list_with_text_search(uid, apps, query)
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
    """Return the full application document, or None if not found or deleted."""
    return await get_collection("applications").find_one(
        {"_id": ObjectId(app_id), "user_id": ObjectId(user_id), "deleted": {"$ne": True}}
    )


async def update(user_id: str, app_id: str, updates: ApplicationUpdate) -> dict | None:
    """Apply partial updates. Appends stage_history entry when current_stage changes."""
    uid = ObjectId(user_id)
    aid = ObjectId(app_id)
    apps = get_collection("applications")
    now = datetime.now(timezone.utc)
    explicitly_set = updates.model_fields_set
    dumped = updates.model_dump()
    set_fields = {k: v for k, v in dumped.items() if k in explicitly_set and v is not None}
    unset_fields = {k: "" for k, v in dumped.items() if k in explicitly_set and v is None}
    if "source_url" in set_fields:
        set_fields["source_url"] = str(set_fields["source_url"])
    set_fields["updated_at"] = now
    update_doc: dict = {"$set": set_fields}
    if unset_fields:
        update_doc["$unset"] = unset_fields
    if "current_stage" in set_fields:
        update_doc["$push"] = {"stage_history": {"stage": set_fields["current_stage"], "transitioned_at": now}}
    result = await apps.find_one_and_update(
        {"_id": aid, "user_id": uid},
        update_doc,
        return_document=ReturnDocument.AFTER,
    )
    if result:
        logger.info("application_updated", user_id=user_id, app_id=app_id)
    return result


async def delete(user_id: str, app_id: str) -> bool:
    """Soft-delete an application by setting deleted=True. Returns True if found."""
    uid = ObjectId(user_id)
    aid = ObjectId(app_id)
    now = datetime.now(timezone.utc)
    result = await get_collection("applications").find_one_and_update(
        {"_id": aid, "user_id": uid, "deleted": {"$ne": True}},
        {"$set": {"deleted": True, "deleted_at": now, "updated_at": now}},
    )
    if result is None:
        return False
    logger.info("application_soft_deleted", user_id=user_id, app_id=app_id)
    return True


async def restore(user_id: str, app_id: str) -> dict | None:
    """Restore a soft-deleted application. Returns updated doc, or None if not found."""
    uid = ObjectId(user_id)
    aid = ObjectId(app_id)
    now = datetime.now(timezone.utc)
    result = await get_collection("applications").find_one_and_update(
        {"_id": aid, "user_id": uid, "deleted": True},
        {"$set": {"deleted": False, "deleted_at": None, "updated_at": now}},
        return_document=ReturnDocument.AFTER,
    )
    if result:
        logger.info("application_restored", user_id=user_id, app_id=app_id)
    return result


async def archive(user_id: str, app_id: str) -> dict | None:
    """Set archived=True and archived_at=now. Returns updated doc, or None if not found."""
    uid = ObjectId(user_id)
    aid = ObjectId(app_id)
    now = datetime.now(timezone.utc)
    result = await get_collection("applications").find_one_and_update(
        {"_id": aid, "user_id": uid},
        {"$set": {"archived": True, "archived_at": now, "updated_at": now}},
        return_document=ReturnDocument.AFTER,
    )
    if result:
        logger.info("application_archived", user_id=user_id, app_id=app_id)
    return result


async def unarchive(user_id: str, app_id: str) -> dict | None:
    """Set archived=False and archived_at=None. Returns updated doc, or None if not found."""
    uid = ObjectId(user_id)
    aid = ObjectId(app_id)
    now = datetime.now(timezone.utc)
    result = await get_collection("applications").find_one_and_update(
        {"_id": aid, "user_id": uid},
        {"$set": {"archived": False, "archived_at": None, "updated_at": now}},
        return_document=ReturnDocument.AFTER,
    )
    if result:
        logger.info("application_unarchived", user_id=user_id, app_id=app_id)
    return result
