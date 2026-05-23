"""Email classifier using Gemini 2.0 Flash via OpenAI-compatible endpoint."""

import asyncio
import json

import structlog
from openai import APIConnectionError, APITimeoutError, AsyncOpenAI

from config import settings

logger = structlog.get_logger()

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
GEMINI_MODEL = "gemini-2.0-flash"
MAX_BODY_CHARS = 800
CLASSIFIER_TIMEOUT_SECONDS = 8.0
CLASSIFIER_RETRY_ATTEMPTS = 2
CLASSIFIER_RETRY_BACKOFF_SECONDS = 1.0


class GmailTransientError(Exception):
    """Raised when the Gemini classifier fails transiently after all retries."""

SYSTEM_PROMPT = (
    "You are a job application email classifier.\n\n"
    "Analyze the email subject and body snippet. Determine if it is a job-application "
    "related email (application confirmations, interview invites, rejection notices, "
    "offer letters, online assessments, phone screen requests).\n\n"
    "If job-related, extract:\n"
    "- company: the hiring company name (string)\n"
    "- role_title: the job title/position (string, or null if unclear)\n"
    "- stage: one of 'Applied', 'Assessment', 'Phone Screen', 'Interview', 'Offer', 'Rejected'\n\n"
    "Return ONLY valid JSON with no markdown fences. Examples:\n"
    '{\"job_related\": false}\n'
    '{\"job_related\": true, \"company\": \"Google\", \"role_title\": \"Software Engineer Intern\", \"stage\": \"Interview\"}'
)


async def classify_email(subject: str, body_snippet: str) -> dict | None:
    """Return extracted job data dict or None if not job-related or on error.

    Raises GmailTransientError if the Gemini API times out after all retries.
    """
    if not settings.gemini_api_key:
        return None

    gemini = AsyncOpenAI(api_key=settings.gemini_api_key, base_url=GEMINI_BASE_URL)
    user_message = f"Subject: {subject}\n\nBody: {body_snippet[:MAX_BODY_CHARS]}"

    last_exc: Exception | None = None
    for attempt in range(CLASSIFIER_RETRY_ATTEMPTS + 1):
        try:
            response = await asyncio.wait_for(
                gemini.chat.completions.create(
                    model=GEMINI_MODEL,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_message},
                    ],
                    temperature=0,
                    max_tokens=200,
                ),
                timeout=CLASSIFIER_TIMEOUT_SECONDS,
            )
            content = response.choices[0].message.content
            if not content:
                return None
            data = json.loads(content.strip())
            if not data.get("job_related"):
                return None
            return data
        except (asyncio.TimeoutError, APITimeoutError, APIConnectionError) as exc:
            last_exc = exc
            if attempt < CLASSIFIER_RETRY_ATTEMPTS:
                await asyncio.sleep((attempt + 1) * CLASSIFIER_RETRY_BACKOFF_SECONDS)
        except (json.JSONDecodeError, KeyError):
            logger.warning("email_classify_parse_error", subject=subject[:80])
            return None
        except Exception:
            logger.exception("email_classify_error", subject=subject[:80])
            return None

    logger.warning(
        "email_classify_transient_failure",
        subject=subject[:80],
        attempts=CLASSIFIER_RETRY_ATTEMPTS + 1,
        error=str(last_exc),
    )
    raise GmailTransientError(f"Gemini classifier failed after retries: {last_exc}")
