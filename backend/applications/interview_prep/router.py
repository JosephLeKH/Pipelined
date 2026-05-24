"""SSE endpoint for the Interview Prep Agent.

GET /api/applications/{app_id}/interview-prep
Uses GET (not POST) so the browser EventSource API works without CSRF tokens.
The CSRF middleware only applies to POST/PATCH/DELETE.
"""

import asyncio
import json
import re
from datetime import datetime, timezone

import structlog
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI

from ai.agent_log import AGENT_TYPE_PREP, STATUS_FAILED, STATUS_SUCCESS, log_agent_run
from ai.openrouter_client import OpenRouterError, agent_llm_configured, complete_json_with_usage
from auth.dependencies import get_verified_user as get_current_user
from config import settings
from database import get_collection
from middleware.rate_limit import get_user_key, limiter
from parsing.ai_cache import (
    PROVIDER_OPENROUTER,
    QuotaExceededError,
    check_and_increment_quota,
    check_budget,
    compute_cache_key,
    get_cached_response,
    store_response,
)

from .agent import run_agent
from .constants import MOCK_INTERVIEW_RATE_LIMIT
from .fit_score import compute_fit_score
from .mock_interview import stream_mock_interview
from . import service as follow_up_service
from .service import FollowUpBudgetError, FollowUpDraftError
from .schemas import MockInterviewRequest

logger = structlog.get_logger()

router = APIRouter(prefix="/api/applications", tags=["interview-prep"])

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
GEMINI_MODEL = "gemini-2.0-flash"
async def _get_application(app_id: str, user_id: str) -> dict:
    """Fetch an application and verify it belongs to the requesting user."""
    try:
        oid = ObjectId(app_id)
        uid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Application not found")

    doc = await get_collection("applications").find_one({"_id": oid, "user_id": uid})
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
    interview_round: str | None = app_doc.get("interview_round")
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
                interview_round=interview_round,
            ):
                event_type = event.pop("type")
                if event_type == "done":
                    await log_agent_run(
                        user_id,
                        AGENT_TYPE_PREP,
                        STATUS_SUCCESS,
                        f"Interview prep ready for {company}",
                        application_id=app_id,
                    )
                elif event_type == "error":
                    await log_agent_run(
                        user_id,
                        AGENT_TYPE_PREP,
                        STATUS_FAILED,
                        f"Interview prep failed for {company}",
                        application_id=app_id,
                    )
                yield f"event: {event_type}\ndata: {json.dumps(event)}\n\n"
        except Exception as e:
            logger.exception("interview_prep_stream_error", app_id=app_id, error=str(e))
            await log_agent_run(
                user_id,
                AGENT_TYPE_PREP,
                STATUS_FAILED,
                f"Interview prep failed for {company}",
                application_id=app_id,
            )
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


@router.post("/{app_id}/follow-up-draft")
@limiter.limit("5/hour")
async def generate_follow_up_draft(
    request: Request,  # noqa: ARG001
    app_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    """Generate a professional follow-up email draft for a stale application."""
    user_id = str(user["_id"])
    app_doc = await _get_application(app_id, user_id)

    if not agent_llm_configured():
        raise HTTPException(status_code=503, detail="AI features not configured")

    try:
        draft = await follow_up_service.generate_follow_up_draft(user_id, app_id, app_doc)
        return {"data": draft}
    except QuotaExceededError as exc:
        raise HTTPException(status_code=429, detail=str(exc))
    except FollowUpBudgetError:
        raise HTTPException(status_code=503, detail="AI budget exceeded")
    except FollowUpDraftError:
        raise HTTPException(status_code=502, detail="Draft generation failed")


@router.post("/{app_id}/fit-score")
@limiter.limit("10/hour")
async def generate_fit_score(
    request: Request,  # noqa: ARG001
    app_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    """Generate a fit score evaluating how well the user's profile matches the applied role."""
    user_id = str(user["_id"])
    app_doc = await _get_application(app_id, user_id)

    company: str = app_doc.get("company", "")
    role_title: str = app_doc.get("role_title", app_doc.get("position", ""))
    resume_text = await _get_resume_text(user_id)
    if not resume_text:
        resume_text = "No resume available"

    if not agent_llm_configured():
        raise HTTPException(
            status_code=503,
            detail="AI features not configured",
        )

    try:
        result = await compute_fit_score(user_id, app_id, company, role_title, resume_text)
        if result is None:
            raise HTTPException(status_code=502, detail="Fit score generation failed")
        return {"data": result}
    except QuotaExceededError as exc:
        raise HTTPException(status_code=429, detail=str(exc))
    except (asyncio.TimeoutError, json.JSONDecodeError, KeyError, ValueError):
        logger.exception("fit_score_error", app_id=app_id)
        raise HTTPException(status_code=502, detail="Fit score generation failed")
    except Exception:
        logger.exception("fit_score_error", app_id=app_id)
        raise HTTPException(status_code=502, detail="Fit score generation failed")


@router.post("/{app_id}/mock-interview")
@limiter.limit(MOCK_INTERVIEW_RATE_LIMIT, key_func=get_user_key)
async def mock_interview_stream(
    request: Request,  # noqa: ARG001
    app_id: str,
    body: MockInterviewRequest,
    user: dict = Depends(get_current_user),
) -> StreamingResponse:
    """Stream a mock interview turn or end-of-session debrief as Server-Sent Events."""
    if not agent_llm_configured():
        raise HTTPException(status_code=503, detail="AI features not configured")

    user_id = str(user["_id"])
    app_doc = await _get_application(app_id, user_id)
    resume_text = await _get_resume_text(user_id)

    async def event_stream():
        try:
            async for event in stream_mock_interview(user_id, app_doc, resume_text, body):
                event_type = event.pop("type")
                yield f"event: {event_type}\ndata: {json.dumps(event)}\n\n"
        except Exception as exc:
            logger.exception("mock_interview_stream_error", app_id=app_id, error=str(exc))
            payload = json.dumps({"message": "An unexpected error occurred. Please try again."})
            yield f"event: error\ndata: {payload}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
