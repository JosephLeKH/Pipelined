"""Application CRUD, duplicate guard, and stage transition logic."""

import asyncio
import csv
import io
from datetime import date, datetime, timedelta, timezone
from typing import Any

import structlog
from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ReturnDocument

from applications.schemas import (
    ApplicationCreate,
    ApplicationListQuery,
    ApplicationUpdate,
    BulkEditUpdate,
    ImportResult,
    ImportRowError,
    MAX_IMPORT_ROWS,
)
from auth.service import get_user_by_id
from database import get_client, get_collection
from parsing.ai_cache import QuotaExceededError
from parsing.fit_scorer import score_fit
from parsing.openai_client import parse_with_openai

logger = structlog.get_logger()

INITIAL_STAGE = "Applied"
INACTIVE_STAGES = ["Rejected", "Offer"]
STALE_DAYS = 14
DELETED_PURGE_DAYS = 1

MERGEABLE_FIELDS = (
    "role_title", "company", "current_stage", "location",
    "compensation", "remote_status", "source_url", "company_type", "notes", "tags",
)

LIST_PROJECTION = {
    "role_title": 1,
    "company": 1,
    "company_domain": 1,
    "current_stage": 1,
    "date_applied": 1,
    "source": 1,
    "updated_at": 1,
    "tags": 1,
    "archived": 1,
    "archived_at": 1,
    "ai_analysis.fit_score": 1,
    "follow_up_date": 1,
    "offer_details": 1,
}

CSV_EXPORT_COLUMNS = (
    "id", "role_title", "company", "stage", "location",
    "remote_status", "compensation", "company_type",
    "tags", "applied_at", "updated_at", "notes",
)

EXPORT_PROJECTION = {
    "role_title": 1,
    "company": 1,
    "current_stage": 1,
    "location": 1,
    "remote_status": 1,
    "compensation": 1,
    "company_type": 1,
    "tags": 1,
    "date_applied": 1,
    "updated_at": 1,
    "notes": 1,
}


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


async def _fetch_user_stages(uid: ObjectId) -> list[str]:
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
        # Cursor is handled separately via textScore aggregation pipeline
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
    uid: ObjectId, apps, query: ApplicationListQuery
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


async def _apply_openai_fallback(body: ApplicationCreate) -> ApplicationCreate:
    """Call OpenAI to fill in missing role_title/company when source is extension.

    Returns a (possibly enriched) ApplicationCreate. On failure, returns body unchanged.
    """
    page_text = body.page_text
    if not page_text:
        return body

    try:
        parsed = await parse_with_openai(page_text)
    except Exception:
        # Catch all exceptions from OpenAI calls (network timeouts, API errors, etc.)
        # parse_with_openai already handles and returns None for most errors, so this is a fallback
        logger.warning("openai_fallback_error")
        return body

    updates: dict = {}
    if not body.role_title and parsed.get("role_title"):
        updates["role_title"] = parsed["role_title"]
    if not body.company and parsed.get("company_name"):
        updates["company"] = parsed["company_name"]
    if not body.compensation and parsed.get("compensation"):
        updates["compensation"] = parsed["compensation"]
    if not body.company_type and parsed.get("company_type"):
        updates["company_type"] = parsed["company_type"]
    if not body.location and parsed.get("location"):
        updates["location"] = parsed["location"]
    if not body.remote_status and parsed.get("remote_status"):
        updates["remote_status"] = parsed["remote_status"]

    if not updates:
        return body

    return body.model_copy(update=updates)


def _derive_company_domain(source_url: str | None, company: str | None) -> str | None:
    """Return best-guess company domain from source_url netloc or company name slug."""
    if source_url:
        from urllib.parse import urlparse  # noqa: PLC0415
        netloc = urlparse(source_url).netloc
        return netloc.removeprefix("www.") or None
    if company:
        slug = company.lower().replace(" ", "").replace(",", "").replace(".", "")
        return f"{slug}.com" if slug else None
    return None


async def _score_and_update(
    app_id: str,
    user_id: str,
    resume_text: str,
    job_description: str,
    role_title: str = "",
    company: str = "",
) -> None:
    """Score fit in background and persist ai_analysis on the application."""
    try:
        result = await score_fit(
            resume_text,
            job_description,
            user_id=user_id,
            role_title=role_title,
            company=company,
        )
    except QuotaExceededError as exc:
        logger.info("fit_score_skipped_quota", app_id=app_id, user_id=user_id, limit=exc.limit)
        return
    if result.get("fit_score") is None:
        return
    apps = get_collection("applications")
    ai_analysis = {**result, "scored_at": datetime.now(timezone.utc)}
    update_result = await apps.update_one(
        {"_id": ObjectId(app_id), "user_id": ObjectId(user_id)},
        {"$set": {"ai_analysis": ai_analysis}},
    )
    if update_result.matched_count == 0:
        logger.warning("fit_score_user_mismatch", app_id=app_id, user_id=user_id)
        return
    logger.info("fit_score_saved", app_id=app_id, fit_score=result["fit_score"])


async def create(user_id: str, body: ApplicationCreate) -> dict:
    """Create a new application. Raises DuplicateApplicationError on (user_id, company, role_title) collision.

    When source='extension' and role_title or company is missing, triggers OpenAI fallback parsing.
    If OpenAI fails, the application is saved with whatever partial data exists.
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

    stages = await _fetch_user_stages(uid)
    now = datetime.now(timezone.utc)

    body_dict = body.model_dump(exclude={"page_text"})
    body_dict["source_url"] = str(body.source_url) if body.source_url else None

    company_domain = _derive_company_domain(body_dict.get("source_url"), body.company)
    doc: dict = {
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

    result = await apps.insert_one(doc)
    doc["_id"] = result.inserted_id
    logger.info("application_created", user_id=user_id, app_id=str(result.inserted_id))

    user = await get_user_by_id(user_id)
    resume_text = user.get("resume_text", "") if user else ""
    if resume_text:
        job_description = " ".join(
            filter(None, [body.role_title, body.company, body.page_text])
        )
        asyncio.create_task(
            _score_and_update(
                str(result.inserted_id),
                user_id,
                resume_text,
                job_description,
                role_title=body.role_title or "",
                company=body.company or "",
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


async def purge_stale_deleted_applications() -> int:
    """Hard-delete applications soft-deleted more than DELETED_PURGE_DAYS ago."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=DELETED_PURGE_DAYS)
    apps = get_collection("applications")
    events = get_collection("calendar_events")
    db_client = get_client()

    docs = await apps.find(
        {"deleted": True, "deleted_at": {"$lt": cutoff}}, {"_id": 1}
    ).to_list(length=None)
    if not docs:
        return 0

    ids = [d["_id"] for d in docs]
    async with await db_client.start_session() as session:
        async with session.start_transaction():
            await events.delete_many({"application_id": {"$in": ids}}, session=session)
            result = await apps.delete_many({"_id": {"$in": ids}}, session=session)

    logger.info("purged_deleted_applications", count=result.deleted_count)
    return result.deleted_count


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


async def export_applications(user_id: str, include_archived: bool = False) -> str:
    """Return all matching applications serialized as a CSV string."""
    uid = ObjectId(user_id)
    apps = get_collection("applications")

    mongo_filter: dict = {"user_id": uid}
    if not include_archived:
        mongo_filter["archived"] = {"$ne": True}

    docs = await apps.find(mongo_filter, projection=EXPORT_PROJECTION).to_list(length=None)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(CSV_EXPORT_COLUMNS)
    for doc in docs:
        tags = ";".join(doc.get("tags") or [])
        applied = doc.get("date_applied")
        updated = doc.get("updated_at")
        writer.writerow([
            str(doc["_id"]),
            doc.get("role_title") or "",
            doc.get("company") or "",
            doc.get("current_stage") or "",
            doc.get("location") or "",
            doc.get("remote_status") or "",
            doc.get("compensation") or "",
            doc.get("company_type") or "",
            tags,
            applied.isoformat() if applied else "",
            updated.isoformat() if updated else "",
            doc.get("notes") or "",
        ])
    logger.info("applications_exported", user_id=user_id, count=len(docs))
    return output.getvalue()


async def bulk_delete(user_id: str, ids: list[str]) -> int:
    """Delete multiple applications and their linked calendar_events. Returns deleted_count."""
    uid = ObjectId(user_id)
    try:
        oid_list = [ObjectId(i) for i in ids]
    except (ValueError, TypeError, InvalidId):
        return 0

    db_client = get_client()
    apps = get_collection("applications")
    events = get_collection("calendar_events")

    async with await db_client.start_session() as session:
        async with session.start_transaction():
            result = await apps.delete_many(
                {"_id": {"$in": oid_list}, "user_id": uid}, session=session
            )
            deleted_count = result.deleted_count
            if deleted_count > 0:
                await events.delete_many(
                    {"application_id": {"$in": oid_list}, "user_id": uid}, session=session
                )

    logger.info("bulk_applications_deleted", user_id=user_id, count=deleted_count)
    return deleted_count


async def bulk_update_stage(user_id: str, ids: list[str], stage: str) -> int:
    """Update stage for multiple applications. Appends stage_history entry. Returns modified_count."""
    uid = ObjectId(user_id)
    try:
        oid_list = [ObjectId(i) for i in ids]
    except (ValueError, TypeError, InvalidId):
        return 0

    apps = get_collection("applications")
    now = datetime.now(timezone.utc)

    result = await apps.update_many(
        {"_id": {"$in": oid_list}, "user_id": uid},
        {
            "$set": {"current_stage": stage, "updated_at": now},
            "$push": {"stage_history": {"stage": stage, "transitioned_at": now}},
        },
    )

    logger.info("bulk_stage_updated", user_id=user_id, stage=stage, count=result.modified_count)
    return result.modified_count


async def bulk_edit(user_id: str, application_ids: list[str], update: BulkEditUpdate) -> int:
    """Apply bulk edits (stage, follow_up_date, tags) to multiple applications. Returns modified_count."""
    uid = ObjectId(user_id)
    try:
        oid_list = [ObjectId(i) for i in application_ids]
    except (ValueError, TypeError, InvalidId):
        return 0

    apps = get_collection("applications")
    now = datetime.now(timezone.utc)

    q: dict = {"_id": {"$in": oid_list}, "user_id": uid}
    set_fields: dict = {"updated_at": now}
    if update.current_stage is not None:
        set_fields["current_stage"] = update.current_stage
    if update.follow_up_date is not None:
        set_fields["follow_up_date"] = update.follow_up_date

    update_doc: dict = {"$set": set_fields}
    if update.current_stage is not None:
        update_doc["$push"] = {
            "stage_history": {"stage": update.current_stage, "transitioned_at": now}
        }
    if update.tags_add:
        update_doc["$addToSet"] = {"tags": {"$each": update.tags_add}}
    # $pull cannot coexist with $addToSet on the same field — run as a second call when both present
    if update.tags_remove and not update.tags_add:
        update_doc["$pull"] = {"tags": {"$in": update.tags_remove}}

    result = await apps.update_many(q, update_doc)
    modified_count = result.modified_count

    if update.tags_add and update.tags_remove:
        await apps.update_many(q, {"$pull": {"tags": {"$in": update.tags_remove}}})

    logger.info("bulk_edit_applied", user_id=user_id, count=modified_count)
    return modified_count


STREAK_LOOKBACK_WEEKS = 52


def _current_iso_week_bounds() -> tuple[str, str]:
    """Return (monday_iso, sunday_iso) strings for the current ISO week."""
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    return monday.isoformat(), (monday + timedelta(days=6)).isoformat()


def _compute_weekly_stats(date_applied_list: list[str], weekly_goal: int) -> tuple[int, int]:
    """Return (applied_this_week, current_streak) from ISO date strings."""
    monday_str, sunday_str = _current_iso_week_bounds()
    applied_this_week = sum(1 for d in date_applied_list if monday_str <= d <= sunday_str)

    week_counts: dict[tuple[int, int], int] = {}
    for d_str in date_applied_list:
        try:
            d = date.fromisoformat(d_str)
        except ValueError:
            continue
        iso = d.isocalendar()
        key = (iso.year, iso.week)
        week_counts[key] = week_counts.get(key, 0) + 1

    today = date.today()
    streak = 0
    check = today - timedelta(days=today.weekday() + 7)
    for _ in range(STREAK_LOOKBACK_WEEKS):
        iso = check.isocalendar()
        if week_counts.get((iso.year, iso.week), 0) >= weekly_goal:
            streak += 1
            check -= timedelta(weeks=1)
        else:
            break
    return applied_this_week, streak


def _extract_date_str(value: object) -> str:
    """Return ISO date string from a datetime object or existing string."""
    if isinstance(value, datetime):
        return value.date().isoformat()
    return str(value) if value else ""


async def compute_stats(user_id: str) -> dict:
    """Return StatsResponse fields using a single $facet aggregation plus weekly stats."""
    uid = ObjectId(user_id)
    col = get_collection("applications")
    stale_cutoff = datetime.now(timezone.utc) - timedelta(days=STALE_DAYS)

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
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
            "stale": [
                {"$match": {
                    "current_stage": {"$nin": INACTIVE_STAGES},
                    "updated_at": {"$lt": stale_cutoff},
                }},
                {"$count": "count"},
            ],
            "date_applied_list": [
                {"$match": {"deleted": {"$ne": True}}},
                {"$project": {"_id": 0, "date_applied": 1}},
            ],
            "follow_ups_due": [
                {"$match": {
                    "archived": {"$ne": True},
                    "deleted": {"$ne": True},
                    "follow_up_date": {"$ne": None, "$lte": today},
                }},
                {"$count": "count"},
            ],
        }},
    ]

    user_doc, raw, tag_offer_rates = await asyncio.gather(
        get_user_by_id(user_id),
        col.aggregate(pipeline).to_list(length=None),
        _compute_tag_offer_rates(user_id, col),
    )
    raw = raw[0]
    weekly_goal = user_doc.get("weekly_goal", 5) if user_doc else 5
    total = raw["total"][0]["count"] if raw["total"] else 0
    active = raw["active"][0]["count"] if raw["active"] else 0
    with_response = raw["with_response"][0]["count"] if raw["with_response"] else 0
    avg_days = round(raw["avg_response_days"][0]["avg"], 1) if raw["avg_response_days"] else None
    stale = raw["stale"][0]["count"] if raw["stale"] else 0
    dates = [_extract_date_str(d.get("date_applied")) for d in raw["date_applied_list"]]
    applied_this_week, current_streak = _compute_weekly_stats(dates, weekly_goal)
    follow_ups_due = raw["follow_ups_due"][0]["count"] if raw["follow_ups_due"] else 0

    return {
        "total_applied": total,
        "active_count": active,
        "response_rate": round(with_response / total, 2) if total > 0 else 0.0,
        "avg_days_to_first_response": avg_days,
        "stale_count": stale,
        "applied_this_week": applied_this_week,
        "current_streak": current_streak,
        "follow_ups_due": follow_ups_due,
        "tag_offer_rates": tag_offer_rates,
    }


RESPONSE_STAGES = ["Phone Screen", "Onsite", "Offer"]

SALARY_BUCKET_LABELS: list[str] = ["$0–50k", "$50–100k", "$100–150k", "$150–200k", "$200k+"]
SALARY_BUCKET_THRESHOLDS: list[int] = [50_000, 100_000, 150_000, 200_000]


def _parse_compensation(text: str) -> int | None:
    """Extract the first numeric salary from a compensation string.

    Handles: "$120k", "120K", "120000", "$120,000", "120k-150k".
    Returns the value in whole dollars, or None if unparseable.
    """
    import re  # noqa: PLC0415 — avoid module-level re import for this helper

    m = re.search(r"(\d+(?:\.\d+)?)\s*[kK]", text)
    if m:
        return int(float(m.group(1)) * 1_000)
    m = re.search(r"(\d[\d,]{3,})", text)
    if m:
        return int(m.group(1).replace(",", ""))
    return None


async def _get_salary_distribution(col, base_filter: dict) -> list[dict]:
    """Parse compensation strings and return salary bucket counts."""
    docs = await col.find(
        {**base_filter, "compensation": {"$nin": [None, ""]}},
        {"compensation": 1},
    ).to_list(length=None)

    counts = {label: 0 for label in SALARY_BUCKET_LABELS}
    for doc in docs:
        val = _parse_compensation(doc.get("compensation") or "")
        if val is None:
            continue
        if val < SALARY_BUCKET_THRESHOLDS[0]:
            counts[SALARY_BUCKET_LABELS[0]] += 1
        elif val < SALARY_BUCKET_THRESHOLDS[1]:
            counts[SALARY_BUCKET_LABELS[1]] += 1
        elif val < SALARY_BUCKET_THRESHOLDS[2]:
            counts[SALARY_BUCKET_LABELS[2]] += 1
        elif val < SALARY_BUCKET_THRESHOLDS[3]:
            counts[SALARY_BUCKET_LABELS[3]] += 1
        else:
            counts[SALARY_BUCKET_LABELS[4]] += 1

    return [{"bucket": label, "count": counts[label]} for label in SALARY_BUCKET_LABELS]


async def get_analytics(user_id: str, days: int | None = None) -> dict:
    """Return aggregated analytics data for the user's applications.

    Args:
        user_id: The user to scope the query to.
        days: Lookback window (30/90/180). None means all-time.
    """
    import asyncio  # noqa: PLC0415 — local import to keep module-level clean

    col = get_collection("applications")
    uid = ObjectId(user_id)

    base_filter: dict = {"user_id": uid, "archived": {"$ne": True}}
    if days is not None:
        cutoff = datetime.now(tz=timezone.utc) - timedelta(days=days)
        base_filter["date_applied"] = {"$gte": cutoff}

    pipeline = [
        {"$match": base_filter},
        {"$facet": {
            "by_week": [
                {"$group": {
                    "_id": {"$dateToString": {"format": "%G-W%V", "date": "$date_applied"}},
                    "count": {"$sum": 1},
                }},
                {"$sort": {"_id": 1}},
            ],
            "stage_funnel": [
                {"$group": {"_id": "$current_stage", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
            ],
            "by_month": [
                {"$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m", "date": "$date_applied"}},
                    "total": {"$sum": 1},
                    "responded": {"$sum": {"$cond": [
                        {"$gt": [{"$size": {"$ifNull": ["$stage_history", []]}}, 1]},
                        1, 0,
                    ]}},
                }},
                {"$sort": {"_id": 1}},
            ],
            "top_companies": [
                {"$match": {"company": {"$ne": None}}},
                {"$group": {"_id": "$company", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 10},
            ],
        }},
    ]

    raw_result, salary_dist = await asyncio.gather(
        col.aggregate(pipeline).to_list(length=1),
        _get_salary_distribution(col, base_filter),
    )
    raw = raw_result[0]

    return {
        "applications_by_week": [
            {"week": r["_id"], "count": r["count"]}
            for r in raw["by_week"]
        ],
        "stage_funnel": [
            {"stage": r["_id"], "count": r["count"]}
            for r in raw["stage_funnel"]
        ],
        "response_rate_by_month": [
            {"month": r["_id"], "rate": round(r["responded"] / r["total"], 2) if r["total"] else 0.0}
            for r in raw["by_month"]
        ],
        "top_companies": [
            {"company": r["_id"], "count": r["count"]}
            for r in raw["top_companies"]
        ],
        "salary_distribution": salary_dist,
    }


async def import_applications(user_id: str, csv_bytes: bytes) -> ImportResult:
    """Parse CSV bytes and bulk-insert applications, skipping duplicates.

    Required CSV columns: company, role_title.
    Optional: location, remote_status, compensation, company_type, date_applied.
    Rows exceeding MAX_IMPORT_ROWS are silently truncated (warning included in result).
    """
    uid = ObjectId(user_id)
    apps = get_collection("applications")
    stages = await _fetch_user_stages(uid)
    now = datetime.now(timezone.utc)

    text = csv_bytes.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)

    warning: str | None = None
    if len(rows) > MAX_IMPORT_ROWS:
        warning = f"Only the first {MAX_IMPORT_ROWS} rows were processed."
        rows = rows[:MAX_IMPORT_ROWS]

    errors: list[ImportRowError] = []
    docs_to_insert: list[dict] = []

    for idx, row in enumerate(rows, start=2):  # row 1 = header
        company = (row.get("company") or "").strip()
        role_title = (row.get("role_title") or "").strip()
        if not company or not role_title:
            errors.append(ImportRowError(row=idx, reason="Missing required field: company or role_title"))
            continue

        normalised_company = company.lower()
        normalised_role = role_title.lower()
        existing = await apps.find_one(
            {"user_id": uid, "normalised_company": normalised_company, "normalised_role": normalised_role},
            projection={"_id": 1},
        )
        if existing:
            errors.append(ImportRowError(row=idx, reason="Duplicate: already exists"))
            continue

        date_applied_raw = (row.get("date_applied") or "").strip()
        try:
            date_applied = datetime.fromisoformat(date_applied_raw) if date_applied_raw else now
        except ValueError:
            date_applied = now

        doc: dict = {
            "user_id": uid,
            "company": company,
            "role_title": role_title,
            "normalised_company": normalised_company,
            "normalised_role": normalised_role,
            "current_stage": INITIAL_STAGE,
            "stages": stages,
            "stage_history": [{"stage": INITIAL_STAGE, "transitioned_at": now}],
            "date_applied": date_applied,
            "source": "manual",
            "location": (row.get("location") or "").strip() or None,
            "remote_status": (row.get("remote_status") or "").strip() or None,
            "compensation": (row.get("compensation") or "").strip() or None,
            "company_type": (row.get("company_type") or "").strip() or None,
            "tags": [],
            "archived": False,
            "archived_at": None,
            "created_at": now,
            "updated_at": now,
        }
        docs_to_insert.append(doc)

    imported = 0
    if docs_to_insert:
        result = await apps.insert_many(docs_to_insert, ordered=False)
        imported = len(result.inserted_ids)
        logger.info("applications_imported", user_id=user_id, count=imported)

    skipped = len([e for e in errors if "Duplicate" in e.reason])
    return ImportResult(imported=imported, skipped=skipped, errors=errors, warning=warning)


def _is_empty(value: object) -> bool:
    """Return True if value is None, empty string, or empty list."""
    if value is None:
        return True
    if isinstance(value, str) and value == "":
        return True
    if isinstance(value, list) and len(value) == 0:
        return True
    return False


async def merge_applications(user_id: str, source_id: str, target_id: str) -> dict | None:
    """Merge source into target. For each field: keep target's value unless empty, then use source's.

    stage_history arrays are concatenated and sorted by transitioned_at.
    Calendar events linked to source are re-linked to target.
    Source is hard-deleted. Returns updated target doc, or None if either not found.
    """
    uid = ObjectId(user_id)
    src_oid = ObjectId(source_id)
    tgt_oid = ObjectId(target_id)
    apps = get_collection("applications")
    events = get_collection("calendar_events")

    source, target = await asyncio.gather(
        apps.find_one({"_id": src_oid, "user_id": uid}),
        apps.find_one({"_id": tgt_oid, "user_id": uid}),
    )
    if source is None or target is None:
        return None

    updates: dict = {}
    for field in MERGEABLE_FIELDS:
        tgt_val = target.get(field)
        src_val = source.get(field)
        if _is_empty(tgt_val) and not _is_empty(src_val):
            updates[field] = src_val

    combined = sorted(
        target.get("stage_history", []) + source.get("stage_history", []),
        key=lambda e: e["transitioned_at"],
    )
    updates["stage_history"] = combined
    updates["updated_at"] = datetime.now(timezone.utc)

    db_client = get_client()
    async with await db_client.start_session() as session:
        async with session.start_transaction():
            await events.update_many(
                {"application_id": src_oid},
                {"$set": {"application_id": tgt_oid}},
                session=session,
            )
            # Delete source before updating target to avoid unique index conflicts
            # when target adopts fields that match source's values.
            await apps.delete_one({"_id": src_oid}, session=session)
            result = await apps.find_one_and_update(
                {"_id": tgt_oid, "user_id": uid},
                {"$set": updates},
                return_document=ReturnDocument.AFTER,
                session=session,
            )

    if result:
        logger.info("applications_merged", user_id=user_id, source_id=source_id, target_id=target_id)
    return result


async def get_funnel(user_id: str) -> list[dict]:
    """Return per-stage funnel metrics ordered by the user's default_stages.

    For each stage:
      - entered_count: apps that visited this stage (stage appears in stage_history)
      - exited_to_next_count: apps that progressed to a later stage in default_stages order
      - conversion_rate: exited_to_next_count / entered_count (0.0 if no entries)
      - avg_days_in_stage: mean days between entering and leaving the stage (None if no data)
      - dropped_count: entered_count - exited_to_next_count
    """
    col = get_collection("applications")
    uid = ObjectId(user_id)

    user_doc, apps = await asyncio.gather(
        get_user_by_id(user_id),
        col.find(
            {"user_id": uid, "archived": {"$ne": True}},
            {"stage_history": 1, "current_stage": 1},
        ).to_list(length=None),
    )

    from auth.constants import DEFAULT_STAGES  # noqa: PLC0415
    stage_order: list[str] = (user_doc or {}).get("default_stages", DEFAULT_STAGES)
    stage_index: dict[str, int] = {s: i for i, s in enumerate(stage_order)}

    results: list[dict] = []
    now = datetime.now(tz=timezone.utc)

    for stage in stage_order:
        idx = stage_index[stage]
        entered = 0
        exited = 0
        days_list: list[float] = []

        for app in apps:
            history: list[dict] = app.get("stage_history") or []
            visited_stages = {h["stage"] for h in history}

            if stage not in visited_stages:
                continue

            entered += 1

            if any(stage_index.get(s, -1) > idx for s in visited_stages):
                exited += 1

            for i, entry in enumerate(history):
                if entry["stage"] != stage:
                    continue
                entered_at: datetime = entry["transitioned_at"]
                left_at: datetime = history[i + 1]["transitioned_at"] if i + 1 < len(history) else now
                if entered_at.tzinfo is None:
                    entered_at = entered_at.replace(tzinfo=timezone.utc)
                if left_at.tzinfo is None:
                    left_at = left_at.replace(tzinfo=timezone.utc)
                days = (left_at - entered_at).total_seconds() / 86400
                if days >= 0:
                    days_list.append(days)

        avg_days: float | None = round(sum(days_list) / len(days_list), 1) if days_list else None
        conversion_rate = round(exited / entered, 2) if entered > 0 else 0.0

        results.append({
            "stage": stage,
            "entered_count": entered,
            "exited_to_next_count": exited,
            "conversion_rate": conversion_rate,
            "avg_days_in_stage": avg_days,
            "dropped_count": entered - exited,
        })

    return results


OFFER_STAGE = "Offer"


async def get_user_tags(user_id: str) -> list[dict]:
    """Return all tags used by the user, sorted by application count descending."""
    col = get_collection("applications")
    uid = ObjectId(user_id)
    pipeline = [
        {"$match": {"user_id": uid, "deleted": {"$ne": True}}},
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1, "_id": 1}},
        {"$project": {"_id": 0, "name": "$_id", "count": 1}},
    ]
    return await col.aggregate(pipeline).to_list(length=None)


PDF_APP_TABLE_LIMIT = 100
PDF_INTERVIEW_STAGES = {"Phone Screen", "Onsite"}

PDF_REPORT_PROJECTION = {
    "role_title": 1,
    "company": 1,
    "current_stage": 1,
    "date_applied": 1,
    "ai_analysis.fit_score": 1,
}


async def _fetch_pdf_data(user_id: str) -> tuple[dict, dict, list[dict], list[dict]]:
    """Fetch user doc, stats, applications, and funnel data in parallel."""
    col = get_collection("applications")
    uid = ObjectId(user_id)
    user_doc, stats, funnel_data = await asyncio.gather(
        get_user_by_id(user_id),
        compute_stats(user_id),
        get_funnel(user_id),
    )
    apps = await col.find(
        {"user_id": uid, "deleted": {"$ne": True}, "archived": {"$ne": True}},
        projection=PDF_REPORT_PROJECTION,
    ).sort("date_applied", -1).limit(PDF_APP_TABLE_LIMIT).to_list(length=PDF_APP_TABLE_LIMIT)
    return user_doc or {}, stats, apps, funnel_data


def _pdf_cover_elements(styles: Any, user_name: str, export_date: str, stats: dict, interview_rate: float) -> list:
    """Return flowables for the cover page (title, stats summary)."""
    from reportlab.platypus import Paragraph, Spacer, Table, TableStyle  # noqa: PLC0415
    from reportlab.lib import colors  # noqa: PLC0415
    from reportlab.lib.units import inch  # noqa: PLC0415

    elements = [
        Paragraph("Pipeline Report", styles["Title"]),
        Paragraph(user_name, styles["Heading2"]),
        Paragraph(f"Exported: {export_date}", styles["Normal"]),
        Spacer(1, 0.3 * inch),
        Paragraph("Summary", styles["Heading2"]),
    ]
    summary_data = [
        ["Metric", "Value"],
        ["Total Applications", str(stats.get("total_applied", 0))],
        ["Response Rate", f"{stats.get('response_rate', 0.0) * 100:.0f}%"],
        ["Interview Rate", f"{interview_rate * 100:.0f}%"],
        ["Applied This Week", str(stats.get("applied_this_week", 0))],
    ]
    tbl = Table(summary_data, colWidths=[3 * inch, 2 * inch])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6366F1")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(tbl)
    return elements


def _pdf_apps_elements(styles: Any, apps: list[dict]) -> list:
    """Return flowables for the applications table."""
    from reportlab.platypus import Paragraph, Spacer, Table, TableStyle  # noqa: PLC0415
    from reportlab.lib import colors  # noqa: PLC0415
    from reportlab.lib.units import inch  # noqa: PLC0415

    elements: list = [Spacer(1, 0.4 * inch), Paragraph("Applications", styles["Heading2"])]
    header = ["Company", "Role", "Stage", "Applied", "Fit"]
    rows = [header]
    for app in apps:
        applied = app.get("date_applied")
        applied_str = applied.strftime("%Y-%m-%d") if isinstance(applied, datetime) else str(applied or "")[:10]
        fit = app.get("ai_analysis", {}).get("fit_score")
        rows.append([
            app.get("company") or "—",
            (app.get("role_title") or "—")[:40],
            app.get("current_stage") or "—",
            applied_str,
            str(fit) if fit is not None else "—",
        ])
    tbl = Table(rows, colWidths=[1.6 * inch, 2.2 * inch, 1.2 * inch, 1.0 * inch, 0.5 * inch])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6366F1")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(tbl)
    return elements


def _pdf_funnel_elements(styles: Any, funnel_data: list[dict]) -> list:
    """Return flowables for the funnel summary table."""
    from reportlab.platypus import Paragraph, Spacer, Table, TableStyle  # noqa: PLC0415
    from reportlab.lib import colors  # noqa: PLC0415
    from reportlab.lib.units import inch  # noqa: PLC0415

    elements: list = [Spacer(1, 0.4 * inch), Paragraph("Stage Funnel", styles["Heading2"])]
    header = ["Stage", "Entered", "Converted", "Rate", "Avg Days"]
    rows = [header]
    for s in funnel_data:
        rows.append([
            s.get("stage", ""),
            str(s.get("entered_count", 0)),
            str(s.get("exited_to_next_count", 0)),
            f"{s.get('conversion_rate', 0.0) * 100:.0f}%",
            str(s.get("avg_days_in_stage") or "—"),
        ])
    tbl = Table(rows, colWidths=[1.8 * inch, 1.1 * inch, 1.1 * inch, 1.0 * inch, 1.0 * inch])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6366F1")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(tbl)
    return elements


def _pdf_goal_elements(styles: Any, applied_this_week: int, weekly_goal: int) -> list:
    """Return flowables for the weekly goal progress section."""
    from reportlab.platypus import Paragraph, Spacer  # noqa: PLC0415
    from reportlab.lib.units import inch  # noqa: PLC0415

    pct = min(100, round(applied_this_week / weekly_goal * 100)) if weekly_goal > 0 else 0
    return [
        Spacer(1, 0.4 * inch),
        Paragraph("Weekly Goal Progress", styles["Heading2"]),
        Paragraph(
            f"{applied_this_week} / {weekly_goal} applications this week ({pct}% of goal)",
            styles["Normal"],
        ),
    ]


def _build_pdf_bytes(
    user_doc: dict, stats: dict, apps: list[dict], funnel_data: list[dict]
) -> bytes:
    """Assemble all sections into a PDF and return raw bytes."""
    from io import BytesIO  # noqa: PLC0415
    from reportlab.lib.pagesizes import letter  # noqa: PLC0415
    from reportlab.lib.styles import getSampleStyleSheet  # noqa: PLC0415
    from reportlab.platypus import SimpleDocTemplate  # noqa: PLC0415

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, topMargin=0.75 * 72, bottomMargin=0.75 * 72)
    styles = getSampleStyleSheet()
    export_date = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")
    user_name = user_doc.get("display_name") or user_doc.get("email") or "User"

    entered_by_stage = {s["stage"]: s["entered_count"] for s in funnel_data}
    total = stats.get("total_applied", 0)
    interview_entered = sum(entered_by_stage.get(st, 0) for st in PDF_INTERVIEW_STAGES)
    interview_rate = round(interview_entered / total, 2) if total > 0 else 0.0

    weekly_goal: int = user_doc.get("weekly_goal", 0)
    elements: list = []
    elements.extend(_pdf_cover_elements(styles, user_name, export_date, stats, interview_rate))
    elements.extend(_pdf_apps_elements(styles, apps))
    elements.extend(_pdf_funnel_elements(styles, funnel_data))
    if weekly_goal > 0:
        elements.extend(_pdf_goal_elements(styles, stats.get("applied_this_week", 0), weekly_goal))

    doc.build(elements)
    return buf.getvalue()


async def generate_pdf_report(user_id: str) -> bytes:
    """Fetch pipeline data and return a formatted PDF as bytes."""
    user_doc, stats, apps, funnel_data = await _fetch_pdf_data(user_id)
    return _build_pdf_bytes(user_doc, stats, apps, funnel_data)


async def _compute_tag_offer_rates(user_id: str, col) -> list[dict]:
    """Return per-tag offer rates for the current user's applications."""
    uid = ObjectId(user_id)
    pipeline = [
        {"$match": {"user_id": uid, "deleted": {"$ne": True}}},
        {"$unwind": "$tags"},
        {"$group": {
            "_id": "$tags",
            "application_count": {"$sum": 1},
            "offer_count": {"$sum": {"$cond": [{"$eq": ["$current_stage", OFFER_STAGE]}, 1, 0]}},
        }},
        {"$sort": {"application_count": -1, "_id": 1}},
        {"$project": {
            "_id": 0,
            "tag": "$_id",
            "application_count": 1,
            "offer_count": 1,
            "offer_rate": {
                "$cond": [
                    {"$gt": ["$application_count", 0]},
                    {"$round": [{"$divide": ["$offer_count", "$application_count"]}, 2]},
                    0.0,
                ]
            },
        }},
    ]
    return await col.aggregate(pipeline).to_list(length=None)
