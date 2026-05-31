"""Apply pack route handler."""

import json

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from ai.exceptions import AIQuotaExceededError
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
    request: Request,
    app_id: str,
    user: dict = Depends(get_current_user),
):
    """Generate apply pack via SSE streaming or JSON (based on Accept header).

    If Accept: application/json, return blocking JSON response (backward compatible).
    Otherwise, stream as Server-Sent Events (steps + tokens + done).
    """
    user_id = str(user["_id"])
    accept_header = request.headers.get("accept", "").lower()
    use_json_fallback = "application/json" in accept_header

    try:
        # Validate application before streaming
        app_doc = await apply_pack_service._fetch_application(user_id, app_id)
        job_description = app_doc.get("job_description", "").strip()
        if not job_description:
            raise MissingJobDescriptionError
        resume_text = (await apply_pack_service._fetch_resume_text(user_id)).strip()
        if not resume_text:
            raise MissingResumeError
    except ApplicationNotFoundError:
        raise HTTPException(status_code=404, detail={"code": "APP_NOT_FOUND"})
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

    if use_json_fallback:
        # Blocking JSON response for backward compatibility
        try:
            pack = await apply_pack_service.generate_apply_pack(user_id, app_id)
            return {"data": pack.model_dump()}
        except (AIQuotaExceededError, OpenRouterError) as exc:
            raise HTTPException(
                status_code=429 if isinstance(exc, AIQuotaExceededError) else 503,
                detail={"code": "ai_error", "message": str(exc)},
            )
        except Exception:
            logger.exception("apply_pack_json_error", app_id=app_id)
            raise HTTPException(status_code=502, detail={"code": "APPLY_PACK_FAILED"})

    # SSE streaming path
    async def event_stream():
        try:
            async for event in apply_pack_service.stream_apply_pack_with_steps(user_id, app_id):
                yield f"data: {json.dumps(event)}\n\n"
        except MissingJobDescriptionError:
            yield f"data: {json.dumps({'type': 'error', 'code': 'MISSING_JOB_DESCRIPTION'})}\n\n"
        except MissingResumeError:
            yield f"data: {json.dumps({'type': 'error', 'code': 'MISSING_RESUME'})}\n\n"
        except AIQuotaExceededError:
            yield f"data: {json.dumps({'type': 'error', 'code': 'ai_quota_exceeded'})}\n\n"
        except OpenRouterError as exc:
            logger.warning("apply_pack_sse_error", app_id=app_id, error=str(exc))
            yield f"data: {json.dumps({'type': 'error', 'code': 'APPLY_PACK_FAILED'})}\n\n"
        except Exception:
            logger.exception("apply_pack_sse_exception", app_id=app_id)
            yield f"data: {json.dumps({'type': 'error', 'code': 'APPLY_PACK_FAILED'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
