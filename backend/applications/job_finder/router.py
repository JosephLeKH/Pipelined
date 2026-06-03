"""Job Finder route: POST /api/applications/{id}/find-jd.

Returns a JobFinderResult preview. Does NOT auto-save — the frontend
shows the preview, and on user confirmation persists via the existing
PATCH /api/applications/{id} endpoint with {source_url, job_description}.
"""

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request

from ai.exceptions import AIQuotaExceededError
from ai.openrouter_client import OpenRouterError
from applications.job_finder import service as job_finder_service
from applications.job_finder.service import ApplicationNotFoundError, JobFinderError
from auth.dependencies import get_verified_user as get_current_user
from middleware.rate_limit import limiter

logger = structlog.get_logger()

router = APIRouter(prefix="/api/applications", tags=["job-finder"])


@router.post("/{app_id}/find-jd")
@limiter.limit("5/hour")
async def find_job_description(
    request: Request,  # noqa: ARG001
    app_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    """Search the web for a job-listing URL and extract a cleaned JD preview."""
    user_id = str(user["_id"])
    try:
        result = await job_finder_service.find_job_description(user_id, app_id)
    except ApplicationNotFoundError:
        raise HTTPException(
            status_code=404,
            detail={"code": "APP_NOT_FOUND", "message": "Application not found."},
        )
    except JobFinderError as exc:
        raise HTTPException(
            status_code=422,
            detail={"code": "JOB_FINDER_INVALID", "message": str(exc)},
        )
    except AIQuotaExceededError:
        raise HTTPException(
            status_code=429,
            detail={"code": "ai_quota_exceeded", "message": "AI quota reached — try again in a few minutes."},
            headers={"Retry-After": "60"},
        )
    except OpenRouterError:
        raise HTTPException(
            status_code=503,
            detail={"code": "AI_NOT_CONFIGURED", "message": "AI features not configured"},
        )
    except Exception:
        logger.exception("job_finder_error", app_id=app_id)
        raise HTTPException(
            status_code=502,
            detail={"code": "JOB_FINDER_FAILED", "message": "Job finder failed"},
        )
    return {"data": result.model_dump()}
