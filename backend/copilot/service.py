"""Co-pilot chat business logic."""

import json
import re
from datetime import datetime, timezone

import structlog
from bson import ObjectId

from ai.copilot_context import build_copilot_context
from ai.next_action import NextAction
from ai.openrouter_client import OpenRouterError, agent_llm_configured, stream_chat
from config import settings
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
from copilot.step_parser import StepParser
from database import get_collection

logger = structlog.get_logger()

COLLECTION_NAME = "copilot_sessions"

_ACTION_PATTERN = re.compile(r'\{"action"\s*:\s*"[^"]+"[^}]*\}', re.DOTALL)
_NEXT_ACTION_PATTERN = re.compile(r'\{\s*"next_action"\s*:\s*\{[^}]+\}\s*\}', re.DOTALL)


def _strip_action_blocks(text: str) -> str:
    return _ACTION_PATTERN.sub("", text).strip()


def _extract_next_action(text: str) -> NextAction | None:
    """Try to extract and validate a next_action JSON block from the text."""
    match = _NEXT_ACTION_PATTERN.search(text)
    if not match:
        return None
    try:
        block = json.loads(match.group(0))
        next_action_data = block.get("next_action")
        if next_action_data and isinstance(next_action_data, dict):
            return NextAction.model_validate(next_action_data)
    except (json.JSONDecodeError, ValueError) as e:
        logger.debug("copilot_next_action_parse_error", error=str(e))
    return None


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
    """Yield SSE event dicts for a co-pilot chat turn.

    Events:
    - {type: "step", content: "..."} — reasoning step (if reasoning_enabled)
    - {type: "token", content: "..."} — response text token
    - {type: "done", content: "...", actions: [...], next_action?: {...}}
    """
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
    parser = StepParser()

    try:
        async for delta in stream_chat(
            system,
            messages,
            temperature=COPILOT_TEMPERATURE,
            max_tokens=COPILOT_MAX_TOKENS,
            timeout=COPILOT_TIMEOUT_SECONDS,
            reasoning_enabled=settings.reasoning_enabled,
        ):
            parts.append(delta)
            # Parse tokens for step tags
            for event_type, content in parser.feed(delta):
                if event_type == "step":
                    yield {"type": "step", "content": content}
                elif event_type == "token":
                    yield {"type": "token", "content": content}
    except OpenRouterError as exc:
        logger.warning("copilot_stream_error", user_id=user_id, error=str(exc))
        yield {"type": "error", "message": "Co-pilot request failed. Please try again."}
        return

    # Flush any remaining buffered tokens
    for event_type, content in parser.flush():
        if event_type == "token":
            yield {"type": "token", "content": content}

    full_text = "".join(parts)
    actions = parse_copilot_actions(full_text)
    next_action = _extract_next_action(full_text)
    display_text = _strip_action_blocks(full_text)
    # Also strip next_action block and step tags from display
    display_text = _NEXT_ACTION_PATTERN.sub("", display_text).strip()
    display_text = re.sub(r"<step>.*?</step>", "", display_text, flags=re.DOTALL).strip()
    done_event: dict = {"type": "done", "content": display_text, "actions": actions}
    if next_action:
        done_event["next_action"] = next_action.model_dump()
    yield done_event


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
