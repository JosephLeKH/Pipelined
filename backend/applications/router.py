"""Applications route handlers: CRUD and stage management."""

from datetime import datetime

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import ValidationError

from applications import service as app_service
from applications.router_analytics import analytics_router
from applications.router_bulk import bulk_router
from applications.schemas import (
    ApplicationCreate,
    ApplicationListQuery,
    ApplicationResponse,
    ApplicationUpdate,
    PrepChecklistUpsertRequest,
    ValidCompanyType,
    ValidRemoteStatus,
    ValidSortField,
    ValidSortOrder,
    DEFAULT_QUERY_LIMIT,
    MAX_QUERY_LIMIT,
)
from applications.service import DuplicateApplicationError, InvalidCursorError
from auth.dependencies import get_verified_user as get_current_user
from config import settings
from middleware.rate_limit import limiter
from middleware.tier_check import TierLimitExceeded, check_tier_limit

logger = structlog.get_logger()

router = APIRouter(prefix="/api/applications", tags=["applications"])

# Sub-routers registered first so fixed paths resolve before /{app_id}.
router.include_router(analytics_router)
router.include_router(bulk_router)

APP_NOT_FOUND_DETAIL = {"code": "APP_NOT_FOUND", "message": "Application not found."}

TIER_LIMIT_EXCEEDED_DETAIL = {
    "code": "TIER_LIMIT_EXCEEDED",
    "message": "Free plan limit reached. Upgrade to Pro for unlimited access.",
}


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
        await check_tier_limit("max_applications", user_id)
        doc = await app_service.create(user_id, body)
    except TierLimitExceeded as exc:
        raise HTTPException(
            status_code=403,
            detail={**TIER_LIMIT_EXCEEDED_DETAIL, "details": {
                "limit_name": exc.resource,
                "current_usage": exc.current_count,
                "max_allowed": exc.max_allowed,
            }},
        )
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


def _build_app_list_query(
    sort_by: ValidSortField,
    sort_order: ValidSortOrder,
    stage: str | None,
    company_type: ValidCompanyType | None,
    remote_status: ValidRemoteStatus | None,
    tags: list[str] | None,
    date_from: str | None,
    date_to: str | None,
    q: str | None,
    cursor: str | None,
    limit: int,
    include_archived: bool,
) -> ApplicationListQuery:
    """Build an ApplicationListQuery from raw query parameter strings."""
    return ApplicationListQuery(
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
    try:
        query = _build_app_list_query(
            sort_by, sort_order, stage, company_type, remote_status,
            tags, date_from, date_to, q, cursor, limit, include_archived,
        )
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail={"code": "VALIDATION_ERROR", "message": str(exc)})
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


def _prep_checklist_response(doc: dict) -> dict:
    checklist = doc.get("prep_checklist", [])
    checked = sum(1 for item in checklist if item.get("checked"))
    return {"checklist": checklist, "checked_count": checked, "total": len(checklist)}


@router.get("/{app_id}/prep-checklist", status_code=200)
async def get_prep_checklist(
    app_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    """Return the prep checklist and completion progress for an application."""
    user_id = str(user["_id"])
    doc = await app_service.get(user_id, app_id)
    if doc is None:
        raise HTTPException(status_code=404, detail=APP_NOT_FOUND_DETAIL)
    return {"data": _prep_checklist_response(doc)}


@router.post("/{app_id}/prep-checklist", status_code=200)
async def upsert_prep_checklist(
    app_id: str,
    body: PrepChecklistUpsertRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    """Replace the prep checklist for an application."""
    user_id = str(user["_id"])
    update = ApplicationUpdate.model_construct(_fields_set={"prep_checklist"}, prep_checklist=body.checklist)
    doc = await app_service.update(user_id, app_id, update)
    if doc is None:
        raise HTTPException(status_code=404, detail=APP_NOT_FOUND_DETAIL)
    return {"data": _prep_checklist_response(doc)}
