"""Standalone fit score computation — called by router and email service."""

import asyncio
import json
import re
from datetime import datetime, timezone

import structlog
from bson import ObjectId
from openai import AsyncOpenAI

from config import settings
from database import get_collection

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
GEMINI_MODEL = "gemini-2.0-flash"
FIT_SCORE_TIMEOUT_SECONDS = 10.0


async def compute_fit_score(
    user_id: str, app_id: str, company: str, role_title: str, resume_text: str
) -> dict | None:
    """Call Gemini to compute fit score. Returns {score, reason} or None on failure."""
    log = structlog.get_logger()

    if not settings.gemini_api_key:
        return None

    client = AsyncOpenAI(api_key=settings.gemini_api_key, base_url=GEMINI_BASE_URL)
    system_prompt = (
        "You are a career coach evaluating job application fit. Return ONLY valid JSON "
        "with keys: score (integer 0-100), reason (string, 1-2 sentences). "
        "Be direct and honest about fit."
    )
    user_msg = f"Role: {role_title} at {company}\nResume summary:\n{resume_text[:600]}"

    try:
        resp = await asyncio.wait_for(
            client.chat.completions.create(
                model=GEMINI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_msg},
                ],
                temperature=0.3,
                max_tokens=150,
            ),
            timeout=FIT_SCORE_TIMEOUT_SECONDS,
        )

        content = resp.choices[0].message.content
        if not content:
            return None

        # Strip markdown code fences if present
        raw = re.sub(
            r"^```(?:json)?\s*|\s*```$", "", content.strip(), flags=re.DOTALL
        )
        data = json.loads(raw)

        score = int(data["score"])
        if not (0 <= score <= 100):
            return None

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

        return {"score": score, "reason": reason}
    except Exception:
        log.warning("fit_score_failed", app_id=app_id)
        return None
