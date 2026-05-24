"""Build scoped pipeline context for the co-pilot chat."""

import asyncio
import datetime as dt
from zoneinfo import ZoneInfo

import structlog
from bson import ObjectId

from auth.constants import DEFAULT_TIMEZONE
from auth.schemas import agent_profile_from_doc
from database import get_collection

logger = structlog.get_logger()

MAX_CONTEXT_TOKENS = 8000
CHARS_PER_TOKEN = 4
MAX_CONTEXT_CHARS = MAX_CONTEXT_TOKENS * CHARS_PER_TOKEN
MAX_APPLICATIONS = 40
MAX_CALENDAR_EVENTS = 15
STALE_DAYS = 14


def estimate_tokens(text: str) -> int:
    """Approximate token count from character length."""
    if not text:
        return 0
    return max(1, len(text) // CHARS_PER_TOKEN)


def truncate_context(text: str, max_chars: int = MAX_CONTEXT_CHARS) -> str:
    """Trim context to the configured character budget."""
    if len(text) <= max_chars:
        return text
    suffix = "\n\n[context truncated]"
    return text[: max_chars - len(suffix)] + suffix


def _format_application_line(doc: dict) -> str:
    company = doc.get("company") or "Unknown company"
    role = doc.get("role_title") or doc.get("position") or "Unknown role"
    stage = doc.get("current_stage") or doc.get("stage") or "Unknown"
    applied = doc.get("date_applied")
    applied_str = applied.date().isoformat() if isinstance(applied, dt.datetime) else "n/a"
    app_id = str(doc.get("_id", ""))
    return f"- [{app_id}] {role} @ {company} · stage={stage} · applied={applied_str}"


def _format_event_line(doc: dict) -> str:
    title = doc.get("title") or doc.get("event_type") or "Interview"
    event_date = doc.get("date")
    date_str = event_date.isoformat() if hasattr(event_date, "isoformat") else str(event_date)
    app_id = doc.get("application_id")
    app_suffix = f" · app={app_id}" if app_id else ""
    return f"- {date_str}: {title}{app_suffix}"


def _build_profile_section(user_doc: dict) -> str:
    profile = agent_profile_from_doc(user_doc)
    lines = [
        "## User profile",
        f"Display name: {user_doc.get('display_name', '')}",
        f"Timezone: {user_doc.get('timezone', DEFAULT_TIMEZONE)}",
        f"Target roles: {', '.join(profile['target_roles']) or 'none'}",
        f"Preferred locations: {', '.join(profile['preferred_locations']) or 'none'}",
        f"Career goals: {profile['career_goals'] or 'none'}",
        f"Communication style: {profile['communication_style']}",
        f"Memory notes: {profile['memory_notes'] or 'none'}",
        f"Has resume on file: {'yes' if user_doc.get('resume_text') else 'no'}",
    ]
    return "\n".join(lines)


async def _fetch_applications(user_oid: ObjectId) -> list[dict]:
    apps = get_collection("applications")
    cursor = apps.find(
        {"user_id": user_oid, "archived": {"$ne": True}},
        {
            "company": 1,
            "role_title": 1,
            "position": 1,
            "current_stage": 1,
            "stage": 1,
            "date_applied": 1,
            "updated_at": 1,
        },
    ).sort("updated_at", -1).limit(MAX_APPLICATIONS)
    return await cursor.to_list(length=MAX_APPLICATIONS)


async def _fetch_upcoming_events(user_oid: ObjectId, today: dt.date) -> list[dict]:
    events = get_collection("calendar_events")
    cursor = events.find(
        {"user_id": user_oid, "date": {"$gte": today.isoformat()}},
        {"title": 1, "event_type": 1, "date": 1, "application_id": 1},
    ).sort("date", 1).limit(MAX_CALENDAR_EVENTS)
    return await cursor.to_list(length=MAX_CALENDAR_EVENTS)


def _build_pipeline_section(applications: list[dict]) -> str:
    if not applications:
        return "## Pipeline\nNo active applications."
    lines = ["## Pipeline", f"Active applications ({len(applications)}):"]
    lines.extend(_format_application_line(doc) for doc in applications)
    return "\n".join(lines)


def _build_calendar_section(events: list[dict]) -> str:
    if not events:
        return "## Upcoming calendar\nNo upcoming interview events."
    lines = ["## Upcoming calendar", f"Next events ({len(events)}):"]
    lines.extend(_format_event_line(doc) for doc in events)
    return "\n".join(lines)


async def build_copilot_context(user_id: str) -> str:
    """Assemble user-scoped pipeline context capped at MAX_CONTEXT_TOKENS."""
    user_oid = ObjectId(user_id)
    users = get_collection("users")
    user_doc = await users.find_one({"_id": user_oid})
    if not user_doc:
        logger.warning("copilot_context_user_missing", user_id=user_id)
        return ""

    timezone = ZoneInfo(user_doc.get("timezone", DEFAULT_TIMEZONE))
    today = dt.datetime.now(dt.timezone.utc).astimezone(timezone).date()

    applications, events = await asyncio.gather(
        _fetch_applications(user_oid),
        _fetch_upcoming_events(user_oid, today),
    )

    sections = [
        _build_profile_section(user_doc),
        _build_pipeline_section(applications),
        _build_calendar_section(events),
    ]
    context = "\n\n".join(sections)
    trimmed = truncate_context(context)
    logger.info(
        "copilot_context_built",
        user_id=user_id,
        apps=len(applications),
        events=len(events),
        chars=len(trimmed),
        est_tokens=estimate_tokens(trimmed),
    )
    return trimmed
