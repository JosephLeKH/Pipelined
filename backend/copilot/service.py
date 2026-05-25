"""Co-pilot chat business logic."""

import json
import re
from datetime import datetime, timezone

import structlog
from bson import ObjectId

from ai.copilot_context import build_copilot_context
from ai.openrouter_client import OpenRouterError, agent_llm_configured, stream_chat
from copilot.constants import (
    ALLOWED_ACTION,
    BLOCKED_ACTIONS,
    COPILOT_MAX_TOKENS,
    COPILOT_SYSTEM_PROMPT,
    COPILOT_TEMPERATURE,
    COPILOT_TIMEOUT_SECONDS,
    OFF_TOPIC_REFUSAL,
    PROMPT_INJECTION_PATTERNS,
    USER_INPUT_CLOSE,
    USER_INPUT_OPEN,
)
from copilot.schemas import CopilotChatRequest, CopilotSessionSaveRequest
from database import get_collection

logger = structlog.get_logger()

COLLECTION_NAME = "copilot_sessions"

_ACTION_PATTERN = re.compile(r'\{"action"\s*:\s*"[^"]+"[^}]*\}', re.DOTALL)


def _strip_action_blocks(text: str) -> str:
    return _ACTION_PATTERN.sub("", text).strip()


def _looks_like_injection_attempt(text: str) -> bool:
    """Detect obvious prompt-injection phrases in raw user text."""
    lowered = text.lower()
    return any(phrase in lowered for phrase in PROMPT_INJECTION_PATTERNS)


def _sanitize_user_text(text: str) -> str:
    """Strip our own delimiter tokens from user input so they can't break out of the wrapper."""
    return text.replace(USER_INPUT_OPEN, "").replace(USER_INPUT_CLOSE, "")


def _wrap_user_message(text: str) -> str:
    """Wrap user content in delimiters so the model treats it as untrusted data."""
    return f"{USER_INPUT_OPEN}\n{_sanitize_user_text(text)}\n{USER_INPUT_CLOSE}"


def parse_copilot_actions(text: str) -> list[dict]:
    """Extract allowed open_app actions from assistant text."""
    actions: list[dict] = []
    for match in _ACTION_PATTERN.finditer(text):
        raw = match.group(0)
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            continue
        action = payload.get("action")
        if action in BLOCKED_ACTIONS:
            logger.warning("copilot_blocked_action", action=action)
            continue
        if action != ALLOWED_ACTION:
            continue
        path = payload.get("path")
        if not isinstance(path, str) or not path.startswith("/"):
            continue
        label = payload.get("label") if isinstance(payload.get("label"), str) else "Open"
        actions.append({"action": ALLOWED_ACTION, "path": path, "label": label})
    return actions


def _build_messages(body: CopilotChatRequest) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = []
    for item in body.history:
        content = _wrap_user_message(item.content) if item.role == "user" else item.content
        messages.append({"role": item.role, "content": content})
    messages.append({"role": "user", "content": _wrap_user_message(body.message)})
    return messages


async def stream_copilot_reply(user_id: str, body: CopilotChatRequest):
    """Yield SSE event dicts for a co-pilot chat turn."""
    if not agent_llm_configured():
        yield {"type": "error", "message": "AI features not configured"}
        return

    if _looks_like_injection_attempt(body.message):
        logger.warning("copilot_injection_attempt_blocked", user_id=user_id)
        yield {"type": "token", "content": OFF_TOPIC_REFUSAL}
        yield {"type": "done", "content": OFF_TOPIC_REFUSAL, "actions": []}
        return

    context = await build_copilot_context(user_id)
    system = f"{COPILOT_SYSTEM_PROMPT}\n\n# Grounding context (read-only data about this user)\n{context}"
    messages = _build_messages(body)
    parts: list[str] = []

    try:
        async for delta in stream_chat(
            system,
            messages,
            temperature=COPILOT_TEMPERATURE,
            max_tokens=COPILOT_MAX_TOKENS,
            timeout=COPILOT_TIMEOUT_SECONDS,
        ):
            parts.append(delta)
            yield {"type": "token", "content": delta}
    except OpenRouterError as exc:
        logger.warning("copilot_stream_error", user_id=user_id, error=str(exc))
        yield {"type": "error", "message": "Co-pilot request failed. Please try again."}
        return

    full_text = "".join(parts)
    actions = parse_copilot_actions(full_text)
    display_text = _strip_action_blocks(full_text)
    yield {"type": "done", "content": display_text, "actions": actions}


async def get_copilot_session(user_id: str) -> dict:
    """Return persisted co-pilot messages for a user."""
    doc = await get_collection(COLLECTION_NAME).find_one(
        {"user_id": ObjectId(user_id)},
        projection={"messages": 1, "_id": 0},
    )
    messages = doc.get("messages", []) if doc else []
    return {"messages": messages}


async def save_copilot_session(user_id: str, body: CopilotSessionSaveRequest) -> dict:
    """Upsert co-pilot session messages for a user."""
    now = datetime.now(timezone.utc)
    messages = [item.model_dump() for item in body.messages]
    await get_collection(COLLECTION_NAME).update_one(
        {"user_id": ObjectId(user_id)},
        {"$set": {"messages": messages, "updated_at": now}},
        upsert=True,
    )
    logger.info(
        "copilot_session_saved",
        user_id=user_id,
        message_count=len(messages),
    )
    return {"messages": messages}
