"""Resume insights generation comparing resume text to job description."""

from datetime import datetime, timezone

import structlog
from bson import ObjectId
from bson.errors import InvalidId

from ai.openrouter_client import OpenRouterError, complete_json
from applications.resume_insights.schemas import ResumeInsightsResponse
from config import settings
from database import get_collection

logger = structlog.get_logger()

RESUME_INSIGHTS_TIMEOUT_SECONDS = 20.0
RESUME_INSIGHTS_MAX_TOKENS = 1500
RESUME_TEXT_TRUNCATE = 6000
JOB_DESCRIPTION_TRUNCATE = 4000

RESUME_INSIGHTS_SYSTEM_PROMPT = (
    "You are a resume tailoring advisor. Compare the candidate resume to the job description "
    "and return ONLY valid JSON with keys: "
    "keyword_gaps (array of up to 8 missing keywords/skills from the JD), "
    "section_suggestions (array of up to 5 short placement or emphasis tips), "
    "bullet_rewrites (array of up to 5 objects with keys original and suggested — "
    "rewrite weak bullets to better match the JD), "
    "overall_summary (one sentence overview). "
    "Never suggest modifying files — suggestions only."
)


class MissingJobDescriptionError(Exception):
    """Raised when the application has no job description."""


class MissingResumeError(Exception):
    """Raised when the user has no resume text on file."""


class ApplicationNotFoundError(Exception):
    """Raised when the application does not exist for this user."""


async def _fetch_application(user_id: str, app_id: str) -> dict:
    try:
        oid = ObjectId(app_id)
        uid = ObjectId(user_id)
    except (InvalidId, TypeError, ValueError) as exc:
        raise ApplicationNotFoundError from exc

    doc = await get_collection("applications").find_one({"_id": oid, "user_id": uid})
    if not doc:
        raise ApplicationNotFoundError
    return doc


async def _fetch_resume_text(user_id: str) -> str:
    try:
        oid = ObjectId(user_id)
    except (InvalidId, TypeError, ValueError):
        return ""
    doc = await get_collection("users").find_one({"_id": oid}, {"resume_text": 1})
    if not doc:
        return ""
    return doc.get("resume_text", "")


def _build_user_message(resume_text: str, job_description: str) -> str:
    resume = resume_text[:RESUME_TEXT_TRUNCATE]
    jd = job_description[:JOB_DESCRIPTION_TRUNCATE]
    return f"RESUME:\n{resume}\n\nJOB DESCRIPTION:\n{jd}"


def _normalize_insights(raw: dict) -> ResumeInsightsResponse:
    bullet_rewrites = []
    for item in raw.get("bullet_rewrites") or []:
        if isinstance(item, dict) and item.get("original") and item.get("suggested"):
            bullet_rewrites.append({
                "original": str(item["original"]),
                "suggested": str(item["suggested"]),
            })
    return ResumeInsightsResponse(
        keyword_gaps=[str(g) for g in (raw.get("keyword_gaps") or [])[:8]],
        section_suggestions=[str(s) for s in (raw.get("section_suggestions") or [])[:5]],
        bullet_rewrites=bullet_rewrites[:5],
        overall_summary=str(raw.get("overall_summary") or "") or None,
    )


async def _persist_insights(user_id: str, app_id: str, insights: ResumeInsightsResponse) -> None:
    now = datetime.now(timezone.utc)
    await get_collection("applications").update_one(
        {"_id": ObjectId(app_id), "user_id": ObjectId(user_id)},
        {"$set": {
            "resume_insights": insights.model_dump(),
            "resume_insights_at": now,
            "updated_at": now,
        }},
    )


async def generate_resume_insights(user_id: str, app_id: str) -> ResumeInsightsResponse:
    """Generate resume tailoring insights and cache them on the application."""
    app_doc = await _fetch_application(user_id, app_id)
    job_description = (app_doc.get("job_description") or "").strip()
    if not job_description:
        raise MissingJobDescriptionError

    resume_text = (await _fetch_resume_text(user_id)).strip()
    if not resume_text:
        raise MissingResumeError

    if not settings.openrouter_api_key:
        raise OpenRouterError("OpenRouter API key is not configured")

    user_message = _build_user_message(resume_text, job_description)
    raw = await complete_json(
        RESUME_INSIGHTS_SYSTEM_PROMPT,
        user_message,
        model=settings.openrouter_default_model,
        temperature=0.3,
        max_tokens=RESUME_INSIGHTS_MAX_TOKENS,
        timeout=RESUME_INSIGHTS_TIMEOUT_SECONDS,
    )
    insights = _normalize_insights(raw)
    await _persist_insights(user_id, app_id, insights)
    logger.info("resume_insights_generated", user_id=user_id, app_id=app_id)
    return insights
