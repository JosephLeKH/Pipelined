"""Bulk operations: bulk update/delete, stage management, import, merge, and purge."""

import asyncio
import csv
import io
from datetime import datetime, timedelta, timezone

import structlog
from bson import ObjectId
from bson.errors import InvalidId
from motor.motor_asyncio import AsyncIOMotorCollection
from pymongo import ReturnDocument

from applications.schemas import BulkEditUpdate
from applications.schemas_analytics import ImportResult, ImportRowError, MAX_IMPORT_ROWS
from applications.service import fetch_user_stages
from applications.service_ai import auto_score_fit
from applications.service_constants import DELETED_PURGE_DAYS, INITIAL_STAGE, MERGEABLE_FIELDS
from database import get_client, get_collection

logger = structlog.get_logger()

UNDO_STACK_TTL_HOURS = 2
CONFLICT_STAGE = "offer"
_BULK_AUTO_SCORE_CONCURRENCY = 5


async def bulk_delete(user_id: str, ids: list[str]) -> tuple[int, str, list[str]]:
    """Delete multiple applications, storing an undo snapshot. Returns (deleted_count, stack_id, failed_ids)."""
    uid = ObjectId(user_id)
    valid_oids: list[ObjectId] = []
    invalid_ids: list[str] = []
    for raw_id in ids:
        try:
            valid_oids.append(ObjectId(raw_id))
        except (ValueError, TypeError, InvalidId):
            invalid_ids.append(raw_id)

    if not valid_oids:
        return 0, "", ids

    db_client = get_client()
    apps = get_collection("applications")
    events = get_collection("calendar_events")
    undo_stack = get_collection("undo_stack")

    snapshots = await apps.find(
        {"_id": {"$in": valid_oids}, "user_id": uid}
    ).to_list(length=None)
    if not snapshots:
        return 0, "", ids

    found_ids = {str(doc["_id"]) for doc in snapshots}
    failed_ids = invalid_ids + [raw_id for raw_id in ids if raw_id not in found_ids and raw_id not in invalid_ids]

    now = datetime.now(timezone.utc)
    insert_result = await undo_stack.insert_one({
        "user_id": uid,
        "action": "delete",
        "count": len(snapshots),
        "snapshot": snapshots,
        "created_at": now,
        "expires_at": now + timedelta(hours=UNDO_STACK_TTL_HOURS),
    })
    stack_id = str(insert_result.inserted_id)

    async with await db_client.start_session() as session:
        async with session.start_transaction():
            result = await apps.delete_many(
                {"_id": {"$in": valid_oids}, "user_id": uid}, session=session
            )
            deleted_count = result.deleted_count
            if deleted_count > 0:
                await events.delete_many(
                    {"application_id": {"$in": valid_oids}, "user_id": uid}, session=session
                )

    logger.info("bulk_applications_deleted", user_id=user_id, count=deleted_count, stack_id=stack_id)
    return deleted_count, stack_id, failed_ids


async def undo_bulk_delete(user_id: str, stack_id: str) -> dict | None:
    """Restore applications from an undo stack entry. Returns {restored, conflicts, conflict_ids} or None."""
    uid = ObjectId(user_id)
    try:
        stack_oid = ObjectId(stack_id)
    except (ValueError, TypeError, InvalidId):
        return None

    undo_stack = get_collection("undo_stack")
    apps = get_collection("applications")
    now = datetime.now(timezone.utc)

    entry = await undo_stack.find_one({
        "_id": stack_oid,
        "user_id": uid,
        "expires_at": {"$gt": now},
    })
    if entry is None:
        return None

    snapshots = entry.get("snapshot", [])
    restored = 0
    conflict_ids: list[str] = []

    for doc in snapshots:
        doc_id = doc["_id"]
        normalised_company = doc.get("normalised_company", "")
        normalised_role = doc.get("normalised_role", "")
        existing = await apps.find_one(
            {"user_id": uid, "normalised_company": normalised_company, "normalised_role": normalised_role},
            projection={"_id": 1},
        )
        if existing:
            conflict_ids.append(str(doc_id))
        else:
            await apps.insert_one(doc)
            restored += 1

    await undo_stack.delete_one({"_id": stack_oid})
    logger.info("bulk_undo_restored", user_id=user_id, stack_id=stack_id, restored=restored, conflicts=len(conflict_ids))
    return {"restored": restored, "conflicts": len(conflict_ids), "conflict_ids": conflict_ids}


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
        update_doc["$push"] = {"stage_history": {"stage": update.current_stage, "transitioned_at": now}}
    if update.tags_add and update.tags_remove:
        # Both add and remove: use a transaction to ensure atomicity (order matters)
        pass  # handled after the main update
    elif update.tags_add:
        update_doc["$addToSet"] = {"tags": {"$each": update.tags_add}}
    elif update.tags_remove:
        update_doc["$pull"] = {"tags": {"$in": update.tags_remove}}
    result = await apps.update_many(q, update_doc)
    modified_count = result.modified_count
    if update.tags_add and update.tags_remove:
        client = get_client()
        async with await client.start_session() as session:
            async with session.start_transaction():
                await apps.update_many(q, {"$addToSet": {"tags": {"$each": update.tags_add}}}, session=session)
                await apps.update_many(q, {"$pull": {"tags": {"$in": update.tags_remove}}}, session=session)
    logger.info("bulk_edit_applied", user_id=user_id, count=modified_count)
    return modified_count


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
    """Remove a stage by name. Raises ActiveStageError if it is the current stage."""
    from applications.service import ActiveStageError  # noqa: PLC0415
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


async def _process_import_row(
    uid: ObjectId, row: dict, idx: int, apps: AsyncIOMotorCollection, stages: list[str], now: datetime
) -> tuple[dict | None, ImportRowError | None]:
    """Validate and build one import document. Returns (doc, None) or (None, error)."""
    company = (row.get("company") or "").strip()
    role_title = (row.get("role_title") or "").strip()
    if not company or not role_title:
        return None, ImportRowError(row=idx, reason="Missing required field: company or role_title")
    normalised_company = company.lower()
    normalised_role = role_title.lower()
    existing = await apps.find_one(
        {"user_id": uid, "normalised_company": normalised_company, "normalised_role": normalised_role},
        projection={"_id": 1},
    )
    if existing:
        return None, ImportRowError(row=idx, reason="Duplicate: already exists")
    date_applied_raw = (row.get("date_applied") or "").strip()
    try:
        date_applied = datetime.fromisoformat(date_applied_raw) if date_applied_raw else now
    except ValueError:
        date_applied = now
    doc: dict = {
        "user_id": uid, "company": company, "role_title": role_title,
        "normalised_company": normalised_company, "normalised_role": normalised_role,
        "current_stage": INITIAL_STAGE, "stages": stages,
        "stage_history": [{"stage": INITIAL_STAGE, "transitioned_at": now}],
        "date_applied": date_applied, "source": "manual",
        "location": (row.get("location") or "").strip() or None,
        "remote_status": (row.get("remote_status") or "").strip() or None,
        "compensation": (row.get("compensation") or "").strip() or None,
        "company_type": (row.get("company_type") or "").strip() or None,
        "tags": [], "archived": False, "archived_at": None, "created_at": now, "updated_at": now,
    }
    return doc, None


async def import_applications(user_id: str, csv_bytes: bytes) -> tuple[ImportResult, list[str]]:
    """Parse CSV bytes and bulk-insert applications, skipping duplicates.

    Returns (ImportResult, list of inserted application IDs as strings).
    """
    uid = ObjectId(user_id)
    apps = get_collection("applications")
    stages = await fetch_user_stages(uid)
    now = datetime.now(timezone.utc)
    text = csv_bytes.decode("utf-8-sig", errors="replace")
    rows = list(csv.DictReader(io.StringIO(text)))
    warning: str | None = None
    if len(rows) > MAX_IMPORT_ROWS:
        warning = f"Only the first {MAX_IMPORT_ROWS} rows were processed."
        rows = rows[:MAX_IMPORT_ROWS]
    errors: list[ImportRowError] = []
    docs_to_insert: list[dict] = []
    for idx, row in enumerate(rows, start=2):
        doc, err = await _process_import_row(uid, row, idx, apps, stages, now)
        if err:
            errors.append(err)
        elif doc:
            docs_to_insert.append(doc)
    imported = 0
    inserted_ids: list[str] = []
    if docs_to_insert:
        result = await apps.insert_many(docs_to_insert, ordered=False)
        imported = len(result.inserted_ids)
        inserted_ids = [str(oid) for oid in result.inserted_ids]
        logger.info("applications_imported", user_id=user_id, count=imported)
    skipped = len([e for e in errors if "Duplicate" in e.reason])
    return ImportResult(imported=imported, skipped=skipped, errors=errors, warning=warning), inserted_ids


def _is_empty(value: object) -> bool:
    """Return True if value is None, empty string, or empty list."""
    if value is None:
        return True
    if isinstance(value, str) and value == "":
        return True
    if isinstance(value, list) and len(value) == 0:
        return True
    return False


def _apply_merge_updates(target: dict, source: dict) -> dict:
    """Build the $set updates dict for merging source into target."""
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
    return updates


async def merge_applications(user_id: str, source_id: str, target_id: str) -> dict | None:
    """Merge source into target, re-linking calendar events, then hard-delete source."""
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
    updates = _apply_merge_updates(target, source)
    db_client = get_client()
    async with await db_client.start_session() as session:
        async with session.start_transaction():
            await events.update_many(
                {"application_id": src_oid},
                {"$set": {"application_id": tgt_oid}},
                session=session,
            )
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


async def _bounded_auto_score(
    semaphore: asyncio.Semaphore, user_id: str, app_id: str
) -> None:
    """Score one application with semaphore-gated concurrency."""
    async with semaphore:
        await auto_score_fit(user_id=user_id, application_id=app_id)


async def schedule_bulk_auto_scores(user_id: str, application_ids: list[str]) -> None:
    """Fan out auto_score_fit calls capped at _BULK_AUTO_SCORE_CONCURRENCY concurrent.

    Errors are swallowed by auto_score_fit itself; asyncio.gather uses return_exceptions
    so one failure doesn't tank the rest.
    """
    if not application_ids:
        return
    semaphore = asyncio.Semaphore(_BULK_AUTO_SCORE_CONCURRENCY)
    await asyncio.gather(
        *(_bounded_auto_score(semaphore, user_id, app_id) for app_id in application_ids),
        return_exceptions=True,
    )
