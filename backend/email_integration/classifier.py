"""Email classifier using OpenRouter with legacy Gemini fallback."""

import asyncio
import json
import re

import structlog
from openai import APIConnectionError, APITimeoutError, AsyncOpenAI

from ai.openrouter_client import OpenRouterError, complete_json
from config import settings
from parsing.ai_cache import PROVIDER_OPENROUTER, check_budget

logger = structlog.get_logger()

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
GEMINI_MODEL = "gemini-2.0-flash"
MAX_BODY_CHARS = 800
CLASSIFIER_TIMEOUT_SECONDS = 8.0
CLASSIFIER_RETRY_ATTEMPTS = 2
CLASSIFIER_RETRY_BACKOFF_SECONDS = 1.0


class GmailTransientError(Exception):
    """Raised when the email classifier fails transiently after all retries."""

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
    '{"job_related": false}\n'
    '{"job_related": true, "company": "Google", "role_title": "Software Engineer Intern", "stage": "Interview"}'
)


def _parse_classifier_response(content: str) -> dict | None:
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", content.strip(), flags=re.DOTALL)
    data = json.loads(raw)
    if not data.get("job_related"):
        return None
    return data


async def _classify_with_openrouter(user_message: str) -> dict | None:
    if not await check_budget(PROVIDER_OPENROUTER):
        logger.warning("email_classify_budget_exceeded", provider=PROVIDER_OPENROUTER)
        return None

    last_exc: Exception | None = None
    for attempt in range(CLASSIFIER_RETRY_ATTEMPTS + 1):
        try:
            data = await complete_json(
                SYSTEM_PROMPT,
                user_message,
                temperature=0,
                max_tokens=200,
                timeout=CLASSIFIER_TIMEOUT_SECONDS,
            )
            if not data.get("job_related"):
                return None
            return data
        except OpenRouterError as exc:
            last_exc = exc
            if attempt < CLASSIFIER_RETRY_ATTEMPTS:
                await asyncio.sleep((attempt + 1) * CLASSIFIER_RETRY_BACKOFF_SECONDS)
        except (json.JSONDecodeError, KeyError):
            logger.warning("email_classify_parse_error")
            return None

    logger.warning(
        "email_classify_transient_failure",
        provider="openrouter",
        attempts=CLASSIFIER_RETRY_ATTEMPTS + 1,
        error=str(last_exc),
    )
    raise GmailTransientError(f"OpenRouter classifier failed after retries: {last_exc}")


async def _classify_with_gemini(user_message: str) -> dict | None:
    gemini = AsyncOpenAI(api_key=settings.gemini_api_key, base_url=GEMINI_BASE_URL)
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
            return _parse_classifier_response(content)
        except (asyncio.TimeoutError, APITimeoutError, APIConnectionError) as exc:
            last_exc = exc
            if attempt < CLASSIFIER_RETRY_ATTEMPTS:
                await asyncio.sleep((attempt + 1) * CLASSIFIER_RETRY_BACKOFF_SECONDS)
        except (json.JSONDecodeError, KeyError):
            logger.warning("email_classify_parse_error")
            return None
        except Exception:
            logger.exception("email_classify_error")
            return None

    logger.warning(
        "email_classify_transient_failure",
        provider="gemini",
        attempts=CLASSIFIER_RETRY_ATTEMPTS + 1,
        error=str(last_exc),
    )
    raise GmailTransientError(f"Gemini classifier failed after retries: {last_exc}")


async def classify_email(subject: str, body_snippet: str) -> dict | None:
    """Return extracted job data dict or None if not job-related or on error."""
    if not settings.openrouter_api_key and not settings.gemini_api_key:
        return None

    user_message = f"Subject: {subject}\n\nBody: {body_snippet[:MAX_BODY_CHARS]}"
    if settings.openrouter_api_key:
        return await _classify_with_openrouter(user_message)
    return await _classify_with_gemini(user_message)
