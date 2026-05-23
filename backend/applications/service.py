"""Application CRUD core: create, read, update, delete, restore, archive."""

import asyncio
from datetime import datetime, timezone

import structlog
from bson import ObjectId
from bson.errors import InvalidId
from motor.motor_asyncio import AsyncIOMotorCollection
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

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
    initial_stage = body_dict.get("current_stage") or INITIAL_STAGE
    return {
        **body_dict,
        "user_id": uid,
        "normalised_company": normalised_company,
        "normalised_role": normalised_role,
        "current_stage": initial_stage,
        "stages": stages,
        "stage_history": [{"stage": initial_stage, "transitioned_at": now}],
        "date_applied": body_dict.get("date_applied") or now,
        "created_at": now,
        "updated_at": now,
        "company_domain": company_domain,
    }


async def _check_duplicate(
    apps: AsyncIOMotorCollection, uid: ObjectId, company: str, role: str
) -> None:
    """Raise DuplicateApplicationError if (user, company, role) already exists."""
    existing = await apps.find_one(
        {"user_id": uid, "normalised_company": company, "normalised_role": role},
        projection={"_id": 1},
    )
    if existing:
        raise DuplicateApplicationError(str(existing["_id"]))


async def _insert_or_raise_duplicate(
    apps: AsyncIOMotorCollection, uid: ObjectId, doc: dict, company: str, role: str
) -> ObjectId:
    """Insert document, raising DuplicateApplicationError on unique-key conflict."""
    try:
        result = await apps.insert_one(doc)
    except DuplicateKeyError:
        existing = await apps.find_one(
            {"user_id": uid, "normalised_company": company, "normalised_role": role},
            projection={"_id": 1},
        )
        raise DuplicateApplicationError(str(existing["_id"])) if existing else DuplicateApplicationError("unknown")
    return result.inserted_id


async def create(user_id: str, body: ApplicationCreate) -> dict:
    """Create a new application. Raises DuplicateApplicationError on collision."""
    uid = ObjectId(user_id)
    apps = get_collection("applications")
    if body.source == "extension" and (not body.role_title or not body.company):
        body = await _apply_openai_fallback(body)
    normalised_company = (body.company or "").lower()
    normalised_role = (body.role_title or "").lower()
    await _check_duplicate(apps, uid, normalised_company, normalised_role)
    stages, user = await asyncio.gather(fetch_user_stages(uid), get_user_by_id(user_id))
    now = datetime.now(timezone.utc)
    body_dict = body.model_dump(exclude={"page_text"})
    body_dict["source_url"] = str(body.source_url) if body.source_url else None
    company_domain = _derive_company_domain(body_dict.get("source_url"), body.company)
    doc = _build_application_doc(uid, body_dict, normalised_company, normalised_role, stages, now, company_domain)
    inserted_id = await _insert_or_raise_duplicate(apps, uid, doc, normalised_company, normalised_role)
    doc["_id"] = inserted_id
    logger.info("application_created", user_id=user_id, app_id=str(inserted_id))
    resume_text = user.get("resume_text", "") if user else ""
    if resume_text:
        job_desc = " ".join(filter(None, [body.role_title, body.company, body.page_text]))
        asyncio.create_task(_score_and_update(
            str(inserted_id), user_id, resume_text, job_desc,
            role_title=body.role_title or "", company=body.company or "",
        ))
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


async def _toggle_flag(
    user_id: str, app_id: str, flag: str, value: bool,
    extra_filter: dict | None = None,
) -> dict | None:
    """Toggle a boolean flag (deleted/archived) with timestamp. Shared by CRUD ops."""
    uid, aid = ObjectId(user_id), ObjectId(app_id)
    now = datetime.now(timezone.utc)
    query = {"_id": aid, "user_id": uid, **(extra_filter or {})}
    set_fields: dict = {flag: value, "updated_at": now, f"{flag}_at": now if value else None}
    result = await get_collection("applications").find_one_and_update(
        query, {"$set": set_fields}, return_document=ReturnDocument.AFTER,
    )
    if result:
        logger.info(f"application_{flag}_{'set' if value else 'unset'}", user_id=user_id, app_id=app_id)
    return result


async def delete(user_id: str, app_id: str) -> bool:
    """Soft-delete an application. Returns True if found."""
    result = await _toggle_flag(user_id, app_id, "deleted", True, extra_filter={"deleted": {"$ne": True}})
    return result is not None


async def restore(user_id: str, app_id: str) -> dict | None:
    """Restore a soft-deleted application."""
    return await _toggle_flag(user_id, app_id, "deleted", False, extra_filter={"deleted": True})


async def archive(user_id: str, app_id: str) -> dict | None:
    """Set archived=True. Returns updated doc, or None if not found."""
    return await _toggle_flag(user_id, app_id, "archived", True)


async def unarchive(user_id: str, app_id: str) -> dict | None:
    """Set archived=False. Returns updated doc, or None if not found."""
    return await _toggle_flag(user_id, app_id, "archived", False)
