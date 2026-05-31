"""Resume insights route handler."""

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request

from ai.exceptions import AIQuotaExceededError
from ai.openrouter_client import OpenRouterError
from applications.resume_insights import service as insights_service
from applications.resume_insights.service import (
    ApplicationNotFoundError,
    MissingJobDescriptionError,
    MissingResumeError,
)
from auth.dependencies import get_verified_user as get_current_user
from middleware.rate_limit import limiter

logger = structlog.get_logger()

router = APIRouter(prefix="/api/applications", tags=["resume-insights"])


@router.post("/{app_id}/resume-insights")
@limiter.limit("5/hour")
async def generate_resume_insights(
    request: Request,  # noqa: ARG001
    app_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    """Compare resume to job description and return tailoring suggestions."""
    user_id = str(user["_id"])
    try:
        insights = await insights_service.generate_resume_insights(user_id, app_id)
    except ApplicationNotFoundError:
        raise HTTPException(
            status_code=404,
            detail={"code": "APP_NOT_FOUND", "message": "Application not found."},
        )
    except MissingJobDescriptionError:
        raise HTTPException(
            status_code=422,
            detail={"code": "MISSING_JOB_DESCRIPTION", "message": "Job description is required."},
        )
    except MissingResumeError:
        raise HTTPException(
            status_code=422,
            detail={"code": "MISSING_RESUME", "message": "Upload a resume before generating insights."},
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
        logger.exception("resume_insights_error", app_id=app_id)
        raise HTTPException(
            status_code=502,
            detail={"code": "INSIGHTS_FAILED", "message": "Resume insights generation failed"},
        )
    return {"data": insights.model_dump()}
