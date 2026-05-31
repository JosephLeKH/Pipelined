"""Job listings route handlers: browse and detail."""

from datetime import datetime

import structlog
from fastapi import APIRouter, BackgroundTasks, Cookie, Depends, HTTPException, Query

from auth.dependencies import get_current_user
from config import settings
from jobs import service as jobs_service
from jobs.fit_score import ListingNotFoundError, score_listing_for_user
from jobs.sync import sync_github_repos
from parsing.ai_cache import QuotaExceededError
from jobs.schemas import (
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    JobListQuery,
    JobListingResponse,
    JobRecommendationResponse,
    ValidCompanyType,
    ValidExperienceLevel,
    ValidRemoteStatus,
    ValidRoleType,
)

logger = structlog.get_logger()

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


def _parse_date(value: str | None) -> datetime | None:
    """Parse ISO 8601 date string, raising 400 on invalid format."""
    if value is None:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_DATE", "message": "date_from must be ISO 8601 format"}},
        )

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
    query = JobListQuery(
        q=q,
        role_type=role_type,
        experience_level=experience_level,
        company_type=company_type,
        remote_status=remote_status,
        date_from=_parse_date(date_from),
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


@router.get("/recommended", status_code=200)
async def get_recommended_jobs(
    user: dict = Depends(get_current_user),
) -> dict:
    """Return personalized job recommendations for the authenticated user."""
    user_id = str(user["_id"])
    docs = await jobs_service.get_recommended_listings(user_id)
    items = [
        JobRecommendationResponse(
            **JobListingResponse.from_doc(d).model_dump(),
            score=d["_recommendation_score"],
            reason=d["_recommendation_reason"],
        )
        for d in docs
    ]
    return {"data": items}


@router.post("/refresh", status_code=202)
async def refresh_jobs(
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
) -> dict:
    """Trigger a GitHub job sync immediately. Admin allowlist required."""
    email = user.get("email") or ""
    if email not in settings.admin_emails:
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "ADMIN_REQUIRED", "message": "Admin access required."}},
        )
    background_tasks.add_task(sync_github_repos)
    logger.info("jobs.refresh.triggered", email=email)
    return {"data": {"status": "queued", "message": "Job board refresh queued; check back in 30-90s."}}


@router.get("/{listing_id}", status_code=200)
async def get_job(listing_id: str) -> dict:
    """Return a single job listing by id."""
    doc = await jobs_service.get_listing(listing_id)
    if doc is None:
        raise HTTPException(status_code=404, detail=JOB_NOT_FOUND_DETAIL)
    return {"data": JobListingResponse.from_doc(doc)}


@router.post("/{listing_id}/fit-score", status_code=200)
async def score_listing(
    listing_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    """Score this listing against the current user's resume. Cached per (user, listing)."""
    user_id = str(user["_id"])
    try:
        result = await score_listing_for_user(user_id, listing_id)
    except ListingNotFoundError:
        raise HTTPException(status_code=404, detail=JOB_NOT_FOUND_DETAIL)
    except QuotaExceededError as exc:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "AI_DAILY_LIMIT",
                "message": "Daily AI scoring limit reached.",
                "details": {"limit": exc.limit},
            },
        )
    return {"data": result}
