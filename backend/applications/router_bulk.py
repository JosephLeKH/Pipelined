"""Bulk operation route handlers for applications."""

import structlog
from fastapi import APIRouter, Depends, HTTPException, UploadFile

from applications import service_bulk
from applications.schemas import (
    ApplicationResponse,
    BulkDeleteRequest,
    BulkEditRequest,
    BulkStageUpdateRequest,
    MergeApplicationsRequest,
    StageAddRequest,
    MAX_BULK_EDIT_IDS,
    MAX_IMPORT_FILE_SIZE_BYTES,
)
from applications.service import ActiveStageError
from auth.dependencies import get_verified_user as get_current_user
from middleware.tier_check import TierLimitExceeded, check_tier_limit

logger = structlog.get_logger()

bulk_router = APIRouter(tags=["applications"])

APP_NOT_FOUND_DETAIL = {"code": "APP_NOT_FOUND", "message": "Application not found."}

TIER_LIMIT_EXCEEDED_DETAIL = {
    "code": "TIER_LIMIT_EXCEEDED",
    "message": "Free plan limit reached. Upgrade to Pro for unlimited access.",
}


@bulk_router.delete("/bulk", status_code=200)
async def bulk_delete_applications(
    body: BulkDeleteRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    """Delete multiple applications and their linked calendar events."""
    user_id = str(user["_id"])
    deleted_count = await service_bulk.bulk_delete(user_id, body.ids)
    return {"data": {"deleted_count": deleted_count}}


@bulk_router.patch("/bulk-stage", status_code=200)
async def bulk_update_application_stage(
    body: BulkStageUpdateRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    """Update stage for multiple applications, appending stage_history entry."""
    user_id = str(user["_id"])
    updated_count = await service_bulk.bulk_update_stage(user_id, body.ids, body.stage)
    return {"data": {"updated_count": updated_count}}


@bulk_router.post("/bulk-update", status_code=200)
async def bulk_edit_applications(
    body: BulkEditRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    """Bulk-edit stage, follow-up date, and/or tags for up to 50 applications."""
    if not body.application_ids:
        raise HTTPException(
            status_code=400,
            detail={"code": "EMPTY_IDS", "message": "application_ids must not be empty."},
        )
    if len(body.application_ids) > MAX_BULK_EDIT_IDS:
        raise HTTPException(
            status_code=400,
            detail={"code": "TOO_MANY_IDS", "message": f"Bulk edit is limited to {MAX_BULK_EDIT_IDS} applications."},
        )
    user_id = str(user["_id"])
    updated_count = await service_bulk.bulk_edit(user_id, body.application_ids, body.update)
    return {"data": {"updated_count": updated_count}}


@bulk_router.post("/import", status_code=200)
async def import_applications_csv(
    file: UploadFile,
    user: dict = Depends(get_current_user),
) -> dict:
    """Import applications from a CSV file. Returns {imported, skipped, errors}."""
    user_id = str(user["_id"])
    try:
        await check_tier_limit("max_applications", user_id)
    except TierLimitExceeded as exc:
        raise HTTPException(
            status_code=403,
            detail={**TIER_LIMIT_EXCEEDED_DETAIL, "details": {
                "limit_name": exc.resource,
                "current_usage": exc.current_count,
                "max_allowed": exc.max_allowed,
            }},
        )
    csv_bytes = await file.read(MAX_IMPORT_FILE_SIZE_BYTES + 1)
    if len(csv_bytes) > MAX_IMPORT_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail={"code": "FILE_TOO_LARGE", "message": "CSV file exceeds 2 MB limit."},
        )
    result = await service_bulk.import_applications(user_id, csv_bytes)
    return {"data": result.model_dump()}


@bulk_router.post("/merge", status_code=200)
async def merge_applications_endpoint(
    body: MergeApplicationsRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    """Merge source application into target. Returns updated target document."""
    user_id = str(user["_id"])
    result = await service_bulk.merge_applications(user_id, body.source_id, body.target_id)
    if result is None:
        raise HTTPException(status_code=404, detail=APP_NOT_FOUND_DETAIL)
    return {"data": ApplicationResponse.from_doc(result)}


@bulk_router.post("/{app_id}/stages", status_code=200)
async def add_stage(
    app_id: str,
    body: StageAddRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    """Add a custom stage at the given position in the application's stages array."""
    user_id = str(user["_id"])
    stages = await service_bulk.add_stage(user_id, app_id, body.name, body.position)
    if stages is None:
        raise HTTPException(status_code=404, detail=APP_NOT_FOUND_DETAIL)
    return {"data": {"stages": stages}}


@bulk_router.delete("/{app_id}/stages/{stage_name}", status_code=200)
async def remove_stage(
    app_id: str,
    stage_name: str,
    user: dict = Depends(get_current_user),
) -> dict:
    """Remove a stage from the application's stages array. Returns 409 if stage is currently active."""
    user_id = str(user["_id"])
    try:
        stages = await service_bulk.remove_stage(user_id, app_id, stage_name)
    except ActiveStageError:
        raise HTTPException(
            status_code=409,
            detail={"code": "STAGE_ACTIVE", "message": "Cannot remove the currently active stage."},
        )
    if stages is None:
        raise HTTPException(status_code=404, detail=APP_NOT_FOUND_DETAIL)
    return {"data": {"stages": stages}}
