"""SSE endpoint for the Interview Prep Agent.

GET /api/applications/{app_id}/interview-prep
Uses GET (not POST) so the browser EventSource API works without CSRF tokens.
The CSRF middleware only applies to POST/PATCH/DELETE.
"""

import json

import structlog
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from auth.dependencies import get_verified_user as get_current_user
from config import settings
from database import get_collection
from middleware.rate_limit import limiter

from .agent import run_agent

logger = structlog.get_logger()

router = APIRouter(prefix="/api/applications", tags=["interview-prep"])


async def _get_application(app_id: str, user_id: str) -> dict:
    """Fetch an application and verify it belongs to the requesting user."""
    try:
        oid = ObjectId(app_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Application not found")

    doc = await get_collection("applications").find_one({"_id": oid, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")
    return doc


async def _get_resume_text(user_id: str) -> str:
    try:
        oid = ObjectId(user_id)
    except Exception:
        return ""
    doc = await get_collection("users").find_one({"_id": oid}, {"resume_text": 1})
    if not doc:
        return ""
    return doc.get("resume_text", "")


@router.get("/{app_id}/interview-prep")
@limiter.limit("3/hour")
async def interview_prep_stream(
    request: Request,  # noqa: ARG001
    app_id: str,
    user: dict = Depends(get_current_user),
) -> StreamingResponse:
    """Stream interview prep research as Server-Sent Events."""
    user_id = str(user["_id"])
    app_doc = await _get_application(app_id, user_id)
    company: str = app_doc.get("company", "")
    role: str = app_doc.get("role_title", app_doc.get("position", "Software Engineer"))
    resume_text = await _get_resume_text(user_id)

    if not company:
        raise HTTPException(status_code=422, detail="Application has no company name")

    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=503,
            detail="Interview prep is not configured (missing GEMINI_API_KEY)",
        )

    async def event_stream():
        try:
            async for event in run_agent(
                company=company,
                role=role,
                resume_text=resume_text,
                gemini_api_key=settings.gemini_api_key,
                exa_api_key=settings.exa_api_key,
            ):
                event_type = event.pop("type")
                yield f"event: {event_type}\ndata: {json.dumps(event)}\n\n"
        except Exception as e:
            logger.exception("interview_prep_stream_error", app_id=app_id, error=str(e))
            payload = json.dumps({"message": "An unexpected error occurred. Please try again."})
            yield f"event: error\ndata: {payload}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
