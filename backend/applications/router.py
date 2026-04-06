"""Applications route handlers: CRUD, stats, and stage management."""

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import StreamingResponse

from applications import service as app_service
from applications.schemas import (
    ApplicationCreate,
    ApplicationListQuery,
    ApplicationResponse,
    ApplicationUpdate,
    StageAddRequest,
    StatsResponse,
    ValidCompanyType,
    ValidRemoteStatus,
    ValidSortField,
    ValidSortOrder,
    DEFAULT_QUERY_LIMIT,
    MAX_QUERY_LIMIT,
)
from applications.service import ActiveStageError, DuplicateApplicationError
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
        cursor=cursor,
        limit=limit,
        include_archived=include_archived,
    )
    user_id = str(user["_id"])
    docs, next_cursor = await app_service.list_applications(user_id, query)
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
