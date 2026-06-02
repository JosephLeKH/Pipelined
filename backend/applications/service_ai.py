"""AI helpers: OpenAI fallback parsing and fit score persistence."""

import asyncio
from datetime import datetime, timezone

import structlog
from bson import ObjectId

from ai.agent_log import AGENT_TYPE_FIT, STATUS_FAILED, STATUS_SUCCESS, log_agent_run
from ai.exceptions import AIQuotaExceededError
from applications.schemas import ApplicationCreate
from database import get_collection
from parsing.ai_cache import QuotaExceededError
from parsing.fit_scorer import score_fit
from parsing.openai_client import parse_with_openai

logger = structlog.get_logger()

MAX_BACKGROUND_FIT_SCORE_SECONDS = 90


async def _persist_fit_score_error(app_id: str, user_id: str, error_code: str) -> None:
    """Persist fit_score error state to applications collection."""
    try:
        await get_collection("applications").update_one(
            {"_id": ObjectId(app_id), "user_id": ObjectId(user_id)},
            {"$set": {
                "fit_score_status": "error",
                "fit_score_error_at": datetime.now(timezone.utc),
                "fit_score_error_code": error_code,
            }},
        )
    except Exception:
        logger.exception("fit_score_status_persist_failed", app_id=app_id, user_id=user_id)


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
    apps = get_collection("applications")
    now = datetime.now(timezone.utc)
    error_code: str | None = None

    try:
        result = await asyncio.wait_for(
            score_fit(
                resume_text,
                job_description,
                user_id=user_id,
                role_title=role_title,
                company=company,
            ),
            timeout=MAX_BACKGROUND_FIT_SCORE_SECONDS,
        )
    except asyncio.TimeoutError:
        logger.warning("fit_score_timeout", app_id=app_id, user_id=user_id, timeout_sec=MAX_BACKGROUND_FIT_SCORE_SECONDS)
        await _persist_fit_score_error(app_id, user_id, "timeout")
        await log_agent_run(
            user_id, AGENT_TYPE_FIT, STATUS_FAILED, "Fit score timed out", application_id=app_id
        )
        return
    except QuotaExceededError as exc:
        logger.info("fit_score_skipped_quota", app_id=app_id, user_id=user_id, limit=exc.limit)
        await _persist_fit_score_error(app_id, user_id, "quota")
        return
    except AIQuotaExceededError:
        logger.warning("fit_score_openrouter_quota", app_id=app_id, user_id=user_id)
        await _persist_fit_score_error(app_id, user_id, "quota")
        return
    except Exception:
        logger.error("fit_score_scoring_failed", app_id=app_id, user_id=user_id, exc_info=True)
        await _persist_fit_score_error(app_id, user_id, "other")
        await log_agent_run(
            user_id, AGENT_TYPE_FIT, STATUS_FAILED, "Fit score failed", application_id=app_id
        )
        return

    if result.get("fit_score") is None:
        return

    try:
        match_reason = result.get("summary") or ""
        ai_analysis = {**result, "match_reason": match_reason, "scored_at": now}
        update_result = await apps.update_one(
            {"_id": ObjectId(app_id), "user_id": ObjectId(user_id)},
            {"$set": {
                "ai_analysis": ai_analysis,
                "fit_score_status": "complete",
                "fit_score_computed_at": now,
            }},
        )
        if update_result.matched_count == 0:
            logger.warning("fit_score_user_mismatch", app_id=app_id, user_id=user_id)
            return
        logger.info("fit_score_saved", app_id=app_id, fit_score=result["fit_score"])
        await log_agent_run(
            user_id,
            AGENT_TYPE_FIT,
            STATUS_SUCCESS,
            f"Fit score {result['fit_score']}: {match_reason[:120]}",
            application_id=app_id,
        )
    except Exception:
        logger.error("fit_score_persist_failed", app_id=app_id, user_id=user_id, exc_info=True)


async def auto_score_fit(user_id: str, application_id: str) -> None:
    """Background-task entrypoint: silently score a freshly-created application.

    Skips when:
      - app not found or already scored (idempotent — Autopilot may have pre-scored)
      - user has no resume on file
      - generator errors (swallows + logs, never raises)

    Args:
        user_id: User ID (string) to look up resume.
        application_id: Application ID (string) to score.
    """
    try:
        apps = get_collection("applications")
        app = await apps.find_one(
            {"_id": ObjectId(application_id), "user_id": ObjectId(user_id)}
        )
        if app is None:
            logger.info("auto_score_fit_skipped_not_found", app_id=application_id)
            return
        if app.get("ai_analysis"):
            logger.info("auto_score_fit_skipped_already_scored", app_id=application_id)
            return

        # Fetch user's resume text.
        users = get_collection("users")
        user = await users.find_one({"_id": ObjectId(user_id)})
        if user is None:
            logger.info("auto_score_fit_skipped_user_not_found", user_id=user_id)
            return
        resume_text = user.get("resume_text", "")
        if not resume_text:
            logger.info("auto_score_fit_skipped_no_resume", user_id=user_id)
            return

        await _score_and_update(
            app_id=application_id,
            user_id=user_id,
            resume_text=resume_text,
            job_description=app.get("job_description", "") or "",
            role_title=app.get("role_title", "") or "",
            company=app.get("company", "") or "",
        )
    except Exception:
        logger.exception("auto_score_fit_failed", app_id=application_id, user_id=user_id)
