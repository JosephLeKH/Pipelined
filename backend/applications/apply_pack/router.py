"""Apply pack route handler."""

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request

from ai.openrouter_client import OpenRouterError
from applications.apply_pack import service as apply_pack_service
from applications.apply_pack.service import (
    ApplicationNotFoundError,
    MissingJobDescriptionError,
    MissingResumeError,
)
from auth.dependencies import get_verified_user as get_current_user
from middleware.rate_limit import limiter

logger = structlog.get_logger()

router = APIRouter(prefix="/api/applications", tags=["apply-pack"])


@router.post("/{app_id}/apply-pack")
@limiter.limit("5/hour")
async def generate_apply_pack(
    request: Request,  # noqa: ARG001
    app_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    """Generate cover letter, form answers, LinkedIn note, and talking points."""
    user_id = str(user["_id"])
    try:
        pack = await apply_pack_service.generate_apply_pack(user_id, app_id)
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
            detail={"code": "MISSING_RESUME", "message": "Upload a resume before generating apply pack."},
        )
    except OpenRouterError:
        raise HTTPException(
            status_code=503,
            detail={"code": "AI_NOT_CONFIGURED", "message": "AI features not configured"},
        )
    except Exception:
        logger.exception("apply_pack_error", app_id=app_id)
        raise HTTPException(
            status_code=502,
            detail={"code": "APPLY_PACK_FAILED", "message": "Apply pack generation failed"},
        )
    return {"data": pack.model_dump()}
