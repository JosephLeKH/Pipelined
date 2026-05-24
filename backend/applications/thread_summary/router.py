"""Recruiter thread summary route handler."""

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request

from ai.openrouter_client import OpenRouterError
from applications.thread_summary import service as thread_service
from applications.thread_summary.service import (
    ApplicationNotFoundError,
    MissingEmailEventsError,
)
from auth.dependencies import get_verified_user as get_current_user
from middleware.rate_limit import limiter

logger = structlog.get_logger()

router = APIRouter(prefix="/api/applications", tags=["thread-summary"])


@router.post("/{app_id}/thread-summary")
@limiter.limit("5/hour")
async def generate_thread_summary(
    request: Request,  # noqa: ARG001
    app_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    """Summarize recruiter email thread from email_events metadata (no raw bodies)."""
    user_id = str(user["_id"])
    try:
        summary = await thread_service.generate_thread_summary(user_id, app_id)
    except ApplicationNotFoundError:
        raise HTTPException(
            status_code=404,
            detail={"code": "APP_NOT_FOUND", "message": "Application not found."},
        )
    except MissingEmailEventsError:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "NO_EMAIL_EVENTS",
                "message": "No email events found for this application.",
            },
        )
    except OpenRouterError:
        raise HTTPException(
            status_code=503,
            detail={"code": "AI_NOT_CONFIGURED", "message": "AI features not configured"},
        )
    except Exception:
        logger.exception("thread_summary_error", app_id=app_id)
        raise HTTPException(
            status_code=502,
            detail={"code": "THREAD_SUMMARY_FAILED", "message": "Thread summary generation failed"},
        )
    return {"data": summary.model_dump()}
