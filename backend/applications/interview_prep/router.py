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

from auth.dependencies import get_verified_user as get_current_user
from config import settings
from database import get_collection
from middleware.rate_limit import limiter

from .agent import run_agent

logger = structlog.get_logger()

router = APIRouter(prefix="/api/applications", tags=["interview-prep"])

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
GEMINI_MODEL = "gemini-2.0-flash"
FOLLOWUP_TIMEOUT_SECONDS = 10.0
FIT_SCORE_TIMEOUT_SECONDS = 10.0


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

    company: str = app_doc.get("company", "")
    role_title: str = app_doc.get("role_title", app_doc.get("position", ""))
    current_stage: str = app_doc.get("current_stage", app_doc.get("stage", "Applied"))
    date_applied = app_doc.get("date_applied")
    date_applied_str = date_applied.isoformat() if date_applied else "Unknown"

    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=503,
            detail="AI features not configured",
        )

    try:
        gemini = AsyncOpenAI(api_key=settings.gemini_api_key, base_url=GEMINI_BASE_URL)
        system_prompt = (
            "You are a professional job-search assistant. Write a short, polite follow-up "
            "email for a job application. Return ONLY valid JSON with keys: subject (string), "
            "body (string). Body should be 3-4 sentences, professional, and not desperate."
        )
        user_message = f"Company: {company}\nRole: {role_title}\nCurrent stage: {current_stage}\nApplied: {date_applied_str}"

        response = await asyncio.wait_for(
            gemini.chat.completions.create(
                model=GEMINI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.7,
                max_tokens=300,
            ),
            timeout=FOLLOWUP_TIMEOUT_SECONDS,
        )

        content = response.choices[0].message.content
        if not content:
            raise HTTPException(status_code=502, detail="Draft generation failed")

        # Strip markdown code fences if present
        raw = re.sub(r'^```(?:json)?\s*|\s*```$', '', content.strip(), flags=re.DOTALL)
        data = json.loads(raw)

        return {"data": {"subject": data.get("subject", ""), "body": data.get("body", "")}}
    except (asyncio.TimeoutError, json.JSONDecodeError, KeyError, ValueError):
        logger.exception("follow_up_draft_error", app_id=app_id)
        raise HTTPException(status_code=502, detail="Draft generation failed")
    except Exception:
        logger.exception("follow_up_draft_error", app_id=app_id)
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

    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=503,
            detail="AI features not configured",
        )

    try:
        gemini = AsyncOpenAI(api_key=settings.gemini_api_key, base_url=GEMINI_BASE_URL)
        system_prompt = (
            "You are a career coach evaluating job application fit. Return ONLY valid JSON "
            "with keys: score (integer 0-100), reason (string, 1-2 sentences). "
            "Be direct and honest about fit."
        )
        user_message = f"Role: {role_title} at {company}\nResume summary:\n{resume_text[:600]}"

        response = await asyncio.wait_for(
            gemini.chat.completions.create(
                model=GEMINI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.3,
                max_tokens=150,
            ),
            timeout=FIT_SCORE_TIMEOUT_SECONDS,
        )

        content = response.choices[0].message.content
        if not content:
            raise HTTPException(status_code=502, detail="Fit score generation failed")

        # Strip markdown code fences if present
        raw = re.sub(r'^```(?:json)?\s*|\s*```$', '', content.strip(), flags=re.DOTALL)
        data = json.loads(raw)

        score = int(data["score"])
        if not (0 <= score <= 100):
            raise ValueError("Score must be between 0 and 100")
        reason = str(data.get("reason", ""))

        # Persist to database
        await get_collection("applications").update_one(
            {"_id": ObjectId(app_id), "user_id": ObjectId(user_id)},
            {
                "$set": {
                    "fit_score": score,
                    "fit_score_reason": reason,
                    "fit_score_at": datetime.now(timezone.utc),
                }
            },
        )

        return {"data": {"score": score, "reason": reason}}
    except (asyncio.TimeoutError, json.JSONDecodeError, KeyError, ValueError):
        logger.exception("fit_score_error", app_id=app_id)
        raise HTTPException(status_code=502, detail="Fit score generation failed")
    except Exception:
        logger.exception("fit_score_error", app_id=app_id)
        raise HTTPException(status_code=502, detail="Fit score generation failed")
