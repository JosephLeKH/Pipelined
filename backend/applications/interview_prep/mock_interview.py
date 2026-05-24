"""Mock interview streaming session service."""

from collections.abc import AsyncGenerator
from datetime import UTC, datetime

import structlog
from bson import ObjectId

from ai.openrouter_client import OpenRouterError, agent_llm_configured, stream_chat
from database import get_collection
from parsing.ai_cache import PROVIDER_OPENROUTER, QuotaExceededError, check_and_increment_quota

from .constants import (
    INTERVIEW_ROUND_FOCUS,
    MOCK_INTERVIEW_DAILY_SESSION_LIMIT,
    MOCK_INTERVIEW_DEBRIEF_MAX_TOKENS,
    MOCK_INTERVIEW_MAX_TOKENS,
    MOCK_INTERVIEW_MAX_TURNS,
    MOCK_INTERVIEW_TEMPERATURE,
    MOCK_INTERVIEW_TIMEOUT_SECONDS,
)
from .schemas import MockInterviewRequest

logger = structlog.get_logger()

MOCK_INTERVIEW_QUOTA_COLLECTION = "mock_interview_quotas"

MOCK_INTERVIEW_SYSTEM_PROMPT = (
    "You are a professional interviewer conducting a realistic mock interview. "
    "Ask one clear question at a time. Stay in character as the interviewer — "
    "do not coach the candidate mid-session. Keep responses concise (2-4 sentences)."
)

MOCK_INTERVIEW_DEBRIEF_PROMPT = (
    "You are an interview coach. Review the mock interview transcript and provide "
    "a structured debrief with: strengths, areas to improve, and 3 specific "
    "action items for the candidate. Be constructive and specific."
)


class MockInterviewLimitError(Exception):
    """Raised when turn or daily session limits are exceeded."""

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


def _count_user_turns(body: MockInterviewRequest) -> int:
    history_turns = sum(1 for item in body.history if item.role == "user")
    if body.end_session:
        return history_turns
    if body.message.strip():
        return history_turns + 1
    return history_turns


def _is_new_session(body: MockInterviewRequest) -> bool:
    return not body.history and not body.end_session


def _round_label(interview_round: str | None) -> str:
    if not interview_round:
        return "general"
    return interview_round.replace("_", " ")


def _build_interviewer_system(
    company: str,
    role: str,
    interview_round: str | None,
    resume_text: str,
) -> str:
    round_focus = INTERVIEW_ROUND_FOCUS.get(interview_round or "", "")
    resume_section = resume_text.strip() or "No resume provided."
    return (
        f"{MOCK_INTERVIEW_SYSTEM_PROMPT}\n\n"
        f"Company: {company}\nRole: {role}\n"
        f"Round type: {_round_label(interview_round)}\n"
        f"{round_focus}\n\nCandidate resume:\n{resume_section}"
    )


def _build_debrief_system(company: str, role: str, interview_round: str | None) -> str:
    return (
        f"{MOCK_INTERVIEW_DEBRIEF_PROMPT}\n\n"
        f"Company: {company}\nRole: {role}\nRound: {_round_label(interview_round)}"
    )


def _history_to_messages(body: MockInterviewRequest) -> list[dict[str, str]]:
    messages = [{"role": item.role, "content": item.content} for item in body.history]
    if body.message.strip() and not body.end_session:
        messages.append({"role": "user", "content": body.message.strip()})
    return messages


async def _check_daily_session_quota(user_id: str, is_new_session: bool) -> None:
    if not is_new_session:
        return

    today = datetime.now(UTC).strftime("%Y-%m-%d")
    col = get_collection(MOCK_INTERVIEW_QUOTA_COLLECTION)
    uid = ObjectId(user_id)
    doc = await col.find_one({"user_id": uid, "date": today})
    sessions = doc.get("sessions", 0) if doc else 0
    if sessions >= MOCK_INTERVIEW_DAILY_SESSION_LIMIT:
        raise MockInterviewLimitError(
            f"Daily mock interview limit reached ({MOCK_INTERVIEW_DAILY_SESSION_LIMIT} per day)."
        )

    await col.update_one(
        {"user_id": uid, "date": today},
        {"$inc": {"sessions": 1}, "$setOnInsert": {"created_at": datetime.now(UTC)}},
        upsert=True,
    )


async def stream_mock_interview(
    user_id: str,
    app_doc: dict,
    resume_text: str,
    body: MockInterviewRequest,
) -> AsyncGenerator[dict, None]:
    """Yield SSE event dicts for a mock interview turn or debrief."""
    if not agent_llm_configured():
        yield {"type": "error", "message": "AI features not configured"}
        return

    user_turns = _count_user_turns(body)
    if user_turns > MOCK_INTERVIEW_MAX_TURNS:
        yield {
            "type": "error",
            "message": f"Maximum {MOCK_INTERVIEW_MAX_TURNS} turns reached for this session.",
        }
        return

    try:
        await _check_daily_session_quota(user_id, _is_new_session(body))
        await check_and_increment_quota(user_id, PROVIDER_OPENROUTER)
    except MockInterviewLimitError as exc:
        yield {"type": "error", "message": exc.message}
        return
    except QuotaExceededError as exc:
        yield {"type": "error", "message": str(exc)}
        return

    company: str = app_doc.get("company", "")
    role: str = app_doc.get("role_title", app_doc.get("position", "Software Engineer"))
    interview_round: str | None = app_doc.get("interview_round")
    messages = _history_to_messages(body)

    if body.end_session:
        if not body.history:
            yield {"type": "error", "message": "No interview history to debrief."}
            return
        system = _build_debrief_system(company, role, interview_round)
        user_content = "\n".join(
            f"{item.role.upper()}: {item.content}" for item in body.history
        )
        messages = [{"role": "user", "content": user_content}]
        max_tokens = MOCK_INTERVIEW_DEBRIEF_MAX_TOKENS
        is_debrief = True
    else:
        system = _build_interviewer_system(company, role, interview_round, resume_text)
        if not messages:
            messages = [{
                "role": "user",
                "content": "Please begin the mock interview with your first question.",
            }]
        max_tokens = MOCK_INTERVIEW_MAX_TOKENS
        is_debrief = False

    parts: list[str] = []
    try:
        async for delta in stream_chat(
            system,
            messages,
            temperature=MOCK_INTERVIEW_TEMPERATURE,
            max_tokens=max_tokens,
            timeout=MOCK_INTERVIEW_TIMEOUT_SECONDS,
        ):
            parts.append(delta)
            yield {"type": "token", "content": delta}
    except OpenRouterError as exc:
        logger.warning("mock_interview_stream_error", user_id=user_id, error=str(exc))
        yield {"type": "error", "message": "Mock interview request failed. Please try again."}
        return

    yield {
        "type": "done",
        "content": "".join(parts),
        "turn_count": user_turns,
        "is_debrief": is_debrief,
    }
