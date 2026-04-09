"""Applications route handlers: CRUD, stats, and stage management."""

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, UploadFile
from fastapi.responses import StreamingResponse

from applications import service as app_service
from applications.schemas import (
    AnalyticsQuery,
    AnalyticsResponse,
    ApplicationCreate,
    ApplicationListQuery,
    ApplicationResponse,
    ApplicationUpdate,
    BulkDeleteRequest,
    BulkStageUpdateRequest,
    ImportResult,
    StageAddRequest,
    StatsResponse,
    ValidCompanyType,
    ValidRemoteStatus,
    ValidSortField,
    ValidSortOrder,
    DEFAULT_QUERY_LIMIT,
    MAX_IMPORT_FILE_SIZE_BYTES,
    MAX_QUERY_LIMIT,
)
from applications.service import ActiveStageError, ApplicationNotFoundError, DuplicateApplicationError, InvalidCursorError
from auth.dependencies import get_current_user
from config import settings
from middleware.rate_limit import limiter

logger = structlog.get_logger()

router = APIRouter(prefix="/api/applications", tags=["applications"])

APP_NOT_FOUND_DETAIL = {"code": "APP_NOT_FOUND", "message": "Application not found."}


@router.post("", status_code=201)
@limiter.limit(settings.rate_limit_ai)
async def create_application(
    request: Request,
    body: ApplicationCreate,
    user: dict = Depends(get_current_user),
) -> dict:
    """Create a new application for the current user."""
    user_id = str(user["_id"])
    try:
        doc = await app_service.create(user_id, body)
    except DuplicateApplicationError as exc:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "DUPLICATE_APPLICATION",
                "message": "An application for this role and company already exists.",
                "details": {"existing_id": exc.existing_id},
            },
        )
    return {"data": ApplicationResponse.from_doc(doc)}


@router.get("/stats", status_code=200)
async def get_stats(user: dict = Depends(get_current_user)) -> dict:
    """Return aggregated stats for the current user's applications."""
    user_id = str(user["_id"])
    stats = await app_service.compute_stats(user_id)
    return {"data": StatsResponse(**stats)}


@router.get("", status_code=200)
async def list_applications(
    sort_by: ValidSortField = Query(default="date_applied"),
    sort_order: ValidSortOrder = Query(default="desc"),
    stage: str | None = Query(default=None),
    company_type: ValidCompanyType | None = Query(default=None),
    remote_status: ValidRemoteStatus | None = Query(default=None),
    tags: list[str] | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    q: str | None = Query(default=None),
    cursor: str | None = Query(default=None),
    limit: int = Query(default=DEFAULT_QUERY_LIMIT, ge=1, le=MAX_QUERY_LIMIT),
    include_archived: bool = Query(default=False),
    user: dict = Depends(get_current_user),
) -> dict:
    """List applications with cursor-based pagination and optional filters."""
    from datetime import datetime

    query = ApplicationListQuery(
        sort_by=sort_by,
        sort_order=sort_order,
        stage=stage,
        company_type=company_type,
        remote_status=remote_status,
        tags=tags,
        date_from=datetime.fromisoformat(date_from) if date_from else None,
        date_to=datetime.fromisoformat(date_to) if date_to else None,
        q=q,
        cursor=cursor,
        limit=limit,
        include_archived=include_archived,
    )
    user_id = str(user["_id"])
    try:
        docs, next_cursor = await app_service.list_applications(user_id, query)
    except InvalidCursorError:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_CURSOR", "message": "Invalid pagination cursor."},
        )
    items = [ApplicationResponse.from_doc(d) for d in docs]
    return {
        "data": items,
        "meta": {"next_cursor": next_cursor, "count": len(items)},
    }


@router.get("/export", status_code=200)
async def export_applications_csv(
    include_archived: bool = Query(default=False),
    user: dict = Depends(get_current_user),
) -> StreamingResponse:
    """Export the current user's applications as a CSV file download."""
    user_id = str(user["_id"])
    csv_content = await app_service.export_applications(user_id, include_archived)
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=applications.csv"},
    )


@router.get("/analytics", status_code=200)
async def get_analytics(
    query: AnalyticsQuery = Depends(),
    user: dict = Depends(get_current_user),
) -> dict:
    """Return aggregated analytics data: applications by week, stage funnel, response rate by month, top companies."""
    user_id = str(user["_id"])
    analytics = await app_service.get_analytics(user_id, query.days)
    return {"data": AnalyticsResponse(**analytics)}


@router.delete("/bulk", status_code=200)
async def bulk_delete_applications(
    body: BulkDeleteRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    """Delete multiple applications and their linked calendar events."""
    user_id = str(user["_id"])
    deleted_count = await app_service.bulk_delete(user_id, body.ids)
    return {"data": {"deleted_count": deleted_count}}


@router.patch("/bulk-stage", status_code=200)
async def bulk_update_application_stage(
    body: BulkStageUpdateRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    """Update stage for multiple applications, appending stage_history entry."""
    user_id = str(user["_id"])
    updated_count = await app_service.bulk_update_stage(user_id, body.ids, body.stage)
    return {"data": {"updated_count": updated_count}}


@router.post("/import", status_code=200)
async def import_applications_csv(
    file: UploadFile,
    user: dict = Depends(get_current_user),
) -> dict:
    """Import applications from a CSV file. Returns {imported, skipped, errors}."""
    user_id = str(user["_id"])
    csv_bytes = await file.read(MAX_IMPORT_FILE_SIZE_BYTES + 1)
    if len(csv_bytes) > MAX_IMPORT_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail={"code": "FILE_TOO_LARGE", "message": "CSV file exceeds 2 MB limit."},
        )
    result = await app_service.import_applications(user_id, csv_bytes)
    return {"data": result.model_dump()}


@router.get("/{app_id}", status_code=200)
async def get_application(
    app_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    """Return the full detail of a single application."""
    user_id = str(user["_id"])
    doc = await app_service.get(user_id, app_id)
    if doc is None:
        raise HTTPException(status_code=404, detail=APP_NOT_FOUND_DETAIL)
    return {"data": ApplicationResponse.from_doc(doc)}


@router.patch("/{app_id}", status_code=200)
async def update_application(
    app_id: str,
    body: ApplicationUpdate,
    user: dict = Depends(get_current_user),
) -> dict:
    """Partially update an application. Appends stage_history on stage change."""
    user_id = str(user["_id"])
    doc = await app_service.update(user_id, app_id, body)
    if doc is None:
        raise HTTPException(status_code=404, detail=APP_NOT_FOUND_DETAIL)
    return {"data": ApplicationResponse.from_doc(doc)}


@router.delete("/{app_id}", status_code=204)
async def delete_application(
    app_id: str,
    user: dict = Depends(get_current_user),
) -> Response:
    """Delete an application and its linked calendar events."""
    user_id = str(user["_id"])
    deleted = await app_service.delete(user_id, app_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=APP_NOT_FOUND_DETAIL)
    return Response(status_code=204)


@router.post("/{app_id}/restore", status_code=200)
async def restore_application(
    app_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    """Restore a soft-deleted application."""
    user_id = str(user["_id"])
    doc = await app_service.restore(user_id, app_id)
    if doc is None:
        raise HTTPException(status_code=404, detail=APP_NOT_FOUND_DETAIL)
    return {"data": ApplicationResponse.from_doc(doc)}


@router.patch("/{app_id}/archive", status_code=200)
async def archive_application(
    app_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    """Soft-delete an application by setting archived=True."""
    user_id = str(user["_id"])
    doc = await app_service.archive(user_id, app_id)
    if doc is None:
        raise HTTPException(status_code=404, detail=APP_NOT_FOUND_DETAIL)
    return {"data": ApplicationResponse.from_doc(doc)}


@router.patch("/{app_id}/unarchive", status_code=200)
async def unarchive_application(
    app_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    """Restore an archived application by setting archived=False."""
    user_id = str(user["_id"])
    doc = await app_service.unarchive(user_id, app_id)
    if doc is None:
        raise HTTPException(status_code=404, detail=APP_NOT_FOUND_DETAIL)
    return {"data": ApplicationResponse.from_doc(doc)}


@router.post("/{app_id}/stages", status_code=200)
async def add_stage(
    app_id: str,
    body: StageAddRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    """Add a custom stage at the given position in the application's stages array."""
    user_id = str(user["_id"])
    stages = await app_service.add_stage(user_id, app_id, body.name, body.position)
    if stages is None:
        raise HTTPException(status_code=404, detail=APP_NOT_FOUND_DETAIL)
    return {"data": {"stages": stages}}


@router.delete("/{app_id}/stages/{stage_name}", status_code=200)
async def remove_stage(
    app_id: str,
    stage_name: str,
    user: dict = Depends(get_current_user),
) -> dict:
    """Remove a stage from the application's stages array. Returns 409 if stage is currently active."""
    user_id = str(user["_id"])
    try:
        stages = await app_service.remove_stage(user_id, app_id, stage_name)
    except ActiveStageError:
        raise HTTPException(
            status_code=409,
            detail={"code": "STAGE_ACTIVE", "message": "Cannot remove the currently active stage."},
        )
    if stages is None:
        raise HTTPException(status_code=404, detail=APP_NOT_FOUND_DETAIL)
    return {"data": {"stages": stages}}
