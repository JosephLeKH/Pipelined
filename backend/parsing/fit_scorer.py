"""OpenAI GPT-4o mini client for scoring resume-to-job fit."""

import json

import structlog
from openai import AsyncOpenAI, OpenAIError

from config import settings

logger = structlog.get_logger()

FIT_SCORE_TEMPERATURE = 0.0
FIT_SCORE_MAX_TOKENS = 300
FIT_SCORE_TIMEOUT_SECONDS = 8
MAX_MATCHED_SKILLS = 8
MAX_MISSING_SKILLS = 5

FIT_SCORE_FIELDS = {"fit_score", "matched_skills", "missing_skills", "summary"}

SYSTEM_PROMPT = (
    "You are a recruiting assistant. Given a candidate resume and a job description, "
    "return a JSON object with exactly these 4 keys:\n"
    "- fit_score: integer 0-100 (how well the resume matches the job)\n"
    f"- matched_skills: array of up to {MAX_MATCHED_SKILLS} strings (skills from the resume that match the job)\n"
    f"- missing_skills: array of up to {MAX_MISSING_SKILLS} strings (skills the job requires but the resume lacks)\n"
    "- summary: string (1-2 sentence explanation of the fit score)\n"
    "Return only valid JSON with these 4 keys and no other text."
)

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            timeout=FIT_SCORE_TIMEOUT_SECONDS,
        )
    return _client


async def score_fit(resume_text: str, job_description: str) -> dict:
    """Call GPT-4o mini to score how well a resume matches a job description.

    Returns a dict with fit_score (int 0-100), matched_skills (list),
    missing_skills (list), and summary (str).
    On any error, returns all null values.
    """
    null_result: dict = {field: None for field in FIT_SCORE_FIELDS}

    if not settings.openai_api_key:
        logger.warning("openai_api_key_missing_for_fit_scorer")
        return null_result

    if not resume_text or not job_description:
        return null_result

    client = _get_client()
    user_content = f"RESUME:\n{resume_text}\n\nJOB DESCRIPTION:\n{job_description}"

    try:
        response = await client.chat.completions.create(
            model=settings.openai_model,
            temperature=FIT_SCORE_TEMPERATURE,
            max_tokens=FIT_SCORE_MAX_TOKENS,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
        )
        raw = response.choices[0].message.content or ""
        parsed = json.loads(raw)
    except (OpenAIError, json.JSONDecodeError, IndexError, AttributeError) as exc:
        logger.warning("fit_score_failed", error=str(exc))
        return null_result

    if not FIT_SCORE_FIELDS.issubset(parsed.keys()):
        logger.warning("fit_score_response_missing_fields", keys=list(parsed.keys()))
        return null_result

    fit_score = parsed.get("fit_score")
    if not isinstance(fit_score, int) or not (0 <= fit_score <= 100):
        logger.warning("fit_score_invalid_value", fit_score=fit_score)
        return null_result

    matched = parsed.get("matched_skills") or []
    missing = parsed.get("missing_skills") or []

    return {
        "fit_score": fit_score,
        "matched_skills": matched[:MAX_MATCHED_SKILLS],
        "missing_skills": missing[:MAX_MISSING_SKILLS],
        "summary": parsed.get("summary"),
    }
