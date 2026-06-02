"""Generate recruiter thread summaries from email_events metadata only."""

from datetime import datetime, timezone

import structlog
from bson import ObjectId
from bson.errors import InvalidId

from ai.openrouter_client import OpenRouterError, agent_llm_configured, complete_json
from applications.thread_summary.schemas import ThreadSummaryResponse
from config import settings
from database import get_collection
from email_integration.email_events import list_email_events_for_application

logger = structlog.get_logger()

THREAD_SUMMARY_TIMEOUT_SECONDS = 15.0
THREAD_SUMMARY_MAX_TOKENS = 600
MAX_REPLY_OPTIONS = 4

THREAD_SUMMARY_SYSTEM_PROMPT = (
    "You are a job-search assistant summarizing recruiter email thread activity. "
    "You receive metadata only (event type, subject line, stage, timestamp) — never email bodies. "
    "Return ONLY valid JSON with keys: "
    "summary (2-3 sentences describing thread progression and current status), "
    "reply_options (array of 3-4 short reply angle labels the candidate could use, "
    "e.g. 'Confirm interview time', 'Ask about next steps'). "
    "Drafts are suggest-only — never imply emails will be sent automatically."
)


class ApplicationNotFoundError(Exception):
    """Raised when the application does not exist for this user."""


class MissingEmailEventsError(Exception):
    """Raised when no email events exist for the application."""


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


def _format_timestamp(value: datetime | str | None) -> str:
    if value is None:
        return "unknown date"
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")
    return str(value)[:10]


def _build_user_message(events: list[dict], company: str, role_title: str) -> str:
    chronological = list(reversed(events))
    lines = [f"Application: {role_title or 'Role'} at {company or 'Company'}"]
    for index, event in enumerate(chronological, start=1):
        lines.append(
            f"Event {index} [{_format_timestamp(event.get('timestamp'))}]: "
            f"{event.get('type', 'unknown')} → stage {event.get('stage', 'n/a')} | "
            f"Subject: \"{event.get('subject', '')}\""
        )
    return "\n".join(lines)


def _normalize_summary(raw: dict) -> ThreadSummaryResponse:
    reply_options = [
        str(option).strip()
        for option in (raw.get("reply_options") or [])
        if str(option).strip()
    ][:MAX_REPLY_OPTIONS]
    summary = str(raw.get("summary") or "").strip()
    return ThreadSummaryResponse(summary=summary, reply_options=reply_options)


async def _persist_summary(user_id: str, app_id: str, summary: ThreadSummaryResponse) -> None:
    now = datetime.now(timezone.utc)
    await get_collection("applications").update_one(
        {"_id": ObjectId(app_id), "user_id": ObjectId(user_id)},
        {"$set": {
            "thread_summary": summary.model_dump(),
            "thread_summary_at": now,
            "updated_at": now,
        }},
    )


async def generate_thread_summary(user_id: str, app_id: str) -> ThreadSummaryResponse:
    """Summarize recruiter email thread from email_events metadata and cache on application."""
    app_doc = await _fetch_application(user_id, app_id)
    events = await list_email_events_for_application(user_id, app_id)
    if not events:
        raise MissingEmailEventsError

    if not agent_llm_configured():
        raise OpenRouterError("No LLM provider configured")

    company = app_doc.get("company", "")
    role_title = app_doc.get("role_title", app_doc.get("position", ""))
    user_message = _build_user_message(events, company, role_title)

    raw = await complete_json(
        THREAD_SUMMARY_SYSTEM_PROMPT,
        user_message,
        temperature=0.4,
        max_tokens=THREAD_SUMMARY_MAX_TOKENS,
        timeout=THREAD_SUMMARY_TIMEOUT_SECONDS,
    )
    summary = _normalize_summary(raw)
    await _persist_summary(user_id, app_id, summary)
    logger.info("thread_summary_generated", user_id=user_id, app_id=app_id)
    return summary
