"""Job listings route handlers: browse and detail."""

import structlog
from fastapi import APIRouter, Cookie, Depends, HTTPException, Query

from auth.dependencies import get_current_user
from jobs import service as jobs_service
from jobs.schemas import (
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    JobListQuery,
    JobListingResponse,
    ValidCompanyType,
    ValidExperienceLevel,
    ValidRemoteStatus,
    ValidRoleType,
)

logger = structlog.get_logger()

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

JOB_NOT_FOUND_DETAIL = {"code": "JOB_NOT_FOUND", "message": "Job listing not found."}


async def _optional_user(
    access_token: str | None = Cookie(default=None),
) -> dict | None:
    """Return current user if authenticated, else None (no error raised)."""
    if not access_token:
        return None
    try:
        return await get_current_user(access_token=access_token)
    except HTTPException:
        return None


@router.get("", status_code=200)
async def list_jobs(
    q: str | None = Query(default=None),
    role_type: ValidRoleType | None = Query(default=None),
    experience_level: ValidExperienceLevel | None = Query(default=None),
    company_type: ValidCompanyType | None = Query(default=None),
    remote_status: ValidRemoteStatus | None = Query(default=None),
    date_from: str | None = Query(default=None),
    salary_min: int | None = Query(default=None, ge=0),
    salary_max: int | None = Query(default=None, ge=0),
    hide_applied: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    user: dict | None = Depends(_optional_user),
) -> dict:
    """Return paginated job listings with optional filters."""
    from datetime import datetime

    query = JobListQuery(
        q=q,
        role_type=role_type,
        experience_level=experience_level,
        company_type=company_type,
        remote_status=remote_status,
        date_from=datetime.fromisoformat(date_from) if date_from else None,
        salary_min=salary_min,
        salary_max=salary_max,
        hide_applied=hide_applied,
        page=page,
        per_page=per_page,
    )
    user_id = str(user["_id"]) if user else None
    docs, total = await jobs_service.list_listings(query, user_id)
    items = [JobListingResponse.from_doc(d) for d in docs]
    return {
        "data": items,
        "meta": {
            "total": total,
            "page": page,
            "per_page": per_page,
        },
    }


@router.get("/{listing_id}", status_code=200)
async def get_job(listing_id: str) -> dict:
    """Return a single job listing by id."""
    doc = await jobs_service.get_listing(listing_id)
    if doc is None:
        raise HTTPException(status_code=404, detail=JOB_NOT_FOUND_DETAIL)
    return {"data": JobListingResponse.from_doc(doc)}
