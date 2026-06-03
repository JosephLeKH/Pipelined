"""Apply pack generation for job applications via OpenRouter."""

import json
from collections.abc import AsyncGenerator
from datetime import datetime, timezone

import structlog
from bson import ObjectId
from bson.errors import InvalidId

from ai.next_action import NextAction
from ai.openrouter_client import OpenRouterError, agent_llm_configured, complete_json, stream_chat
from applications.apply_pack.schemas import ApplyPackResponse, ShortAnswer
from config import settings
from copilot.step_parser import StepParser
from database import get_collection

logger = structlog.get_logger()

APPLY_PACK_TIMEOUT_SECONDS = 30.0
APPLY_PACK_MAX_TOKENS = 2500
RESUME_TEXT_TRUNCATE = 6000
JOB_DESCRIPTION_TRUNCATE = 4000

APPLY_PACK_SYSTEM_PROMPT = (
    "You are an application coach helping a candidate prepare materials. "
    "Return ONLY valid JSON with keys:\n"
    "cover_letter (string — tailored cover letter with this exact structure: "
    "(1) a salutation line ending with a comma, "
    "(2) an opening paragraph stating the role and a one-sentence hook, "
    "(3) a paragraph on relevant experience tied to the JD, "
    "(4) a paragraph on motivation / fit with the company, "
    "(5) a closing paragraph with a call to action and 'Sincerely, <Name>' on the final line. "
    "Separate every paragraph with a blank line — i.e., use the two-character "
    "sequence \\n\\n between paragraphs in the JSON string. Do not return one "
    "run-on block.),\n"
    "short_answers (array of up to 5 objects with keys question and answer — "
    "common application form questions like why this company, work authorization, "
    "years of experience, salary expectations if relevant),\n"
    "linkedin_note (string — short connection note under 300 characters),\n"
    "talking_points (array of up to 6 short strings — key points to mention when applying). "
    "Text only — never suggest auto-submitting or filling forms automatically."
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


def _build_user_message(app_doc: dict, resume_text: str) -> str:
    company = app_doc.get("company") or "Unknown company"
    role = app_doc.get("role_title") or app_doc.get("position") or "Unknown role"
    jd = (app_doc.get("job_description") or "")[:JOB_DESCRIPTION_TRUNCATE]
    resume = resume_text[:RESUME_TEXT_TRUNCATE]
    return (
        f"Role: {role} at {company}\n\n"
        f"JOB DESCRIPTION:\n{jd}\n\n"
        f"RESUME:\n{resume}\n\n"
        "Generate an apply pack the candidate can copy and use manually."
    )


def _normalize_apply_pack(raw: dict, cover_letter_text: str) -> ApplyPackResponse:
    short_answers: list[ShortAnswer] = []
    for item in raw.get("short_answers") or []:
        if isinstance(item, dict) and item.get("question") and item.get("answer"):
            short_answers.append(
                ShortAnswer(question=str(item["question"]), answer=str(item["answer"]))
            )

    talking_points = [
        str(p).strip()
        for p in (raw.get("talking_points") or [])
        if str(p).strip()
    ][:6]

    next_action = None
    if cover_letter_text:
        next_action = NextAction(
            label="Copy cover letter draft",
            intent="copy",
            payload={"text": cover_letter_text},
        )

    return ApplyPackResponse(
        cover_letter=str(raw.get("cover_letter") or "").strip(),
        short_answers=short_answers[:5],
        linkedin_note=str(raw.get("linkedin_note") or "").strip(),
        talking_points=talking_points,
        next_action=next_action,
    )


async def _persist_apply_pack(user_id: str, app_id: str, pack: ApplyPackResponse) -> None:
    now = datetime.now(timezone.utc)
    await get_collection("applications").update_one(
        {"_id": ObjectId(app_id), "user_id": ObjectId(user_id)},
        {"$set": {
            "apply_pack": pack.model_dump(),
            "apply_pack_at": now,
            "updated_at": now,
        }},
    )


async def generate_apply_pack(user_id: str, app_id: str) -> ApplyPackResponse:
    """Generate apply pack materials and cache them on the application."""
    app_doc = await _fetch_application(user_id, app_id)
    job_description = (app_doc.get("job_description") or "").strip()
    if not job_description:
        raise MissingJobDescriptionError

    resume_text = (await _fetch_resume_text(user_id)).strip()
    if not resume_text:
        raise MissingResumeError

    if not agent_llm_configured():
        raise OpenRouterError("No LLM provider configured")

    user_message = _build_user_message(app_doc, resume_text)
    raw = await complete_json(
        APPLY_PACK_SYSTEM_PROMPT,
        user_message,
        temperature=0.4,
        max_tokens=APPLY_PACK_MAX_TOKENS,
        timeout=APPLY_PACK_TIMEOUT_SECONDS,
    )
    cover_letter_text = str(raw.get("cover_letter") or "").strip()
    pack = _normalize_apply_pack(raw, cover_letter_text)
    if not pack.cover_letter:
        raise OpenRouterError("Apply pack generation returned empty cover letter")

    await _persist_apply_pack(user_id, app_id, pack)
    logger.info("apply_pack_generated", user_id=user_id, app_id=app_id)
    return pack


async def stream_apply_pack_with_steps(
    user_id: str,
    app_id: str,
) -> AsyncGenerator[dict, None]:
    """Stream apply pack generation with reasoning steps as SSE events.

    Yields:
    - {type: "step", content: "..."} — reasoning step
    - {type: "token", content: "..."} — response text token
    - {type: "done", apply_pack: {...}, next_action: {...}}
    """
    app_doc = await _fetch_application(user_id, app_id)
    job_description = (app_doc.get("job_description") or "").strip()
    if not job_description:
        raise MissingJobDescriptionError

    resume_text = (await _fetch_resume_text(user_id)).strip()
    if not resume_text:
        raise MissingResumeError

    if not agent_llm_configured():
        raise OpenRouterError("No LLM provider configured")

    user_message = _build_user_message(app_doc, resume_text)
    parser = StepParser()
    parts: list[str] = []

    try:
        async for delta in stream_chat(
            APPLY_PACK_SYSTEM_PROMPT,
            [{"role": "user", "content": user_message}],
            temperature=0.4,
            max_tokens=APPLY_PACK_MAX_TOKENS,
            timeout=APPLY_PACK_TIMEOUT_SECONDS,
            reasoning_enabled=settings.reasoning_enabled,
        ):
            parts.append(delta)
            for event_type, content in parser.feed(delta):
                if event_type == "step":
                    yield {"type": "step", "content": content}
                elif event_type == "token":
                    yield {"type": "token", "content": content}
    except OpenRouterError as exc:
        logger.warning("apply_pack_stream_error", user_id=user_id, app_id=app_id, error=str(exc))
        raise

    # Flush remaining tokens
    for event_type, content in parser.flush():
        if event_type == "token":
            yield {"type": "token", "content": content}

    full_text = "".join(parts)
    # Strip step tags to extract JSON
    clean_text = full_text
    import re
    clean_text = re.sub(r"<step>.*?</step>", "", clean_text, flags=re.DOTALL).strip()

    try:
        raw = json.loads(clean_text)
    except json.JSONDecodeError:
        logger.warning("apply_pack_json_parse_failed", user_id=user_id, app_id=app_id)
        raise OpenRouterError("Apply pack generation returned invalid JSON")

    cover_letter_text = str(raw.get("cover_letter") or "").strip()
    pack = _normalize_apply_pack(raw, cover_letter_text)
    if not pack.cover_letter:
        raise OpenRouterError("Apply pack generation returned empty cover letter")

    await _persist_apply_pack(user_id, app_id, pack)
    logger.info("apply_pack_streamed", user_id=user_id, app_id=app_id)

    done_event: dict = {"type": "done", "apply_pack": pack.model_dump()}
    if pack.next_action:
        done_event["next_action"] = pack.next_action.model_dump()
    yield done_event
