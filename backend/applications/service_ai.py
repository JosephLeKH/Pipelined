"""AI helpers: OpenAI fallback parsing and fit score persistence."""

from datetime import datetime, timezone

import structlog
from bson import ObjectId

from applications.schemas import ApplicationCreate
from database import get_collection
from parsing.ai_cache import QuotaExceededError
from parsing.fit_scorer import score_fit
from parsing.openai_client import parse_with_openai

logger = structlog.get_logger()


async def _apply_openai_fallback(body: ApplicationCreate) -> tuple[ApplicationCreate, bool]:
    """Call OpenAI to fill in missing role_title/company when source is extension.

    Returns a (possibly enriched) ApplicationCreate. On failure, returns body unchanged.
    """
    page_text = body.page_text
    if not page_text:
        return body, False

    try:
        parsed = await parse_with_openai(page_text)
    except Exception:
        logger.warning("openai_fallback_error", exc_info=True)
        return body, False

    updates: dict = {}
    if not body.role_title and parsed.get("role_title"):
        updates["role_title"] = parsed["role_title"]
    if not body.company and parsed.get("company_name"):
        updates["company"] = parsed["company_name"]
    if not body.compensation and parsed.get("compensation"):
        updates["compensation"] = parsed["compensation"]
    if not body.company_type and parsed.get("company_type"):
        updates["company_type"] = parsed["company_type"]
    if not body.location and parsed.get("location"):
        updates["location"] = parsed["location"]
    if not body.remote_status and parsed.get("remote_status"):
        updates["remote_status"] = parsed["remote_status"]

    if not updates:
        return body, False
    return body.model_copy(update=updates), True


def _derive_company_domain(source_url: str | None, company: str | None) -> str | None:
    """Return best-guess company domain from source_url netloc or company name slug."""
    if source_url:
        from urllib.parse import urlparse  # noqa: PLC0415
        netloc = urlparse(source_url).netloc
        return netloc.removeprefix("www.") or None
    if company:
        slug = company.lower().replace(" ", "").replace(",", "").replace(".", "")
        return f"{slug}.com" if slug else None
    return None


async def _score_and_update(
    app_id: str,
    user_id: str,
    resume_text: str,
    job_description: str,
    role_title: str = "",
    company: str = "",
) -> None:
    """Score fit in background and persist ai_analysis on the application."""
    try:
        result = await score_fit(
            resume_text,
            job_description,
            user_id=user_id,
            role_title=role_title,
            company=company,
        )
    except QuotaExceededError as exc:
        logger.info("fit_score_skipped_quota", app_id=app_id, user_id=user_id, limit=exc.limit)
        return
    except Exception:
        logger.error("fit_score_scoring_failed", app_id=app_id, user_id=user_id, exc_info=True)
        return
    if result.get("fit_score") is None:
        return
    try:
        apps = get_collection("applications")
        ai_analysis = {**result, "scored_at": datetime.now(timezone.utc)}
        update_result = await apps.update_one(
            {"_id": ObjectId(app_id), "user_id": ObjectId(user_id)},
            {"$set": {"ai_analysis": ai_analysis}},
        )
        if update_result.matched_count == 0:
            logger.warning("fit_score_user_mismatch", app_id=app_id, user_id=user_id)
            return
        logger.info("fit_score_saved", app_id=app_id, fit_score=result["fit_score"])
    except Exception:
        logger.error("fit_score_persist_failed", app_id=app_id, user_id=user_id, exc_info=True)
