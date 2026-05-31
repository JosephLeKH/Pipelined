"""PII scrubbing rules for Sentry error monitoring.

Masks user emails, company names, and sensitive headers from error events
before sending to Sentry.
"""

import re
from typing import Any

# Email regex pattern for matching email addresses
EMAIL_PATTERN = re.compile(r"[\w\.-]+@[\w\.-]+\.\w+")
# Mask pattern for display
MASKED_EMAIL = "***@***.***"
MASKED_VALUE = "***REDACTED***"


def scrub_pii(event: dict[str, Any], hint: dict[str, Any]) -> dict[str, Any] | None:
    """Scrub PII from Sentry event before transmission.

    Masks:
    - User emails in event['user']['email'] and event['extra']
    - Company names in event['extra']['company']
    - Authorization headers in event['request']['headers']
    - Email patterns in request URLs and query parameters

    Args:
        event: Sentry event dict
        hint: Additional context (e.g., 'exc_info')

    Returns:
        Modified event dict or None to drop the event
    """
    # Mask email in user context
    if event.get("user") and event["user"].get("email"):
        event["user"]["email"] = MASKED_EMAIL

    # Mask email in extra context
    if event.get("extra"):
        if "email" in event["extra"]:
            event["extra"]["email"] = MASKED_EMAIL
        if "company" in event["extra"]:
            event["extra"]["company"] = MASKED_VALUE

    # Strip Authorization header
    if event.get("request") and event["request"].get("headers"):
        if "Authorization" in event["request"]["headers"]:
            del event["request"]["headers"]["Authorization"]

    # Mask email patterns in request URL
    if event.get("request") and event["request"].get("url"):
        url = event["request"]["url"]
        event["request"]["url"] = EMAIL_PATTERN.sub(MASKED_EMAIL, url)

    # Mask email patterns in message and breadcrumbs
    if event.get("message"):
        event["message"] = EMAIL_PATTERN.sub(MASKED_EMAIL, str(event["message"]))

    for breadcrumb in event.get("breadcrumbs", []):
        if breadcrumb.get("message"):
            breadcrumb["message"] = EMAIL_PATTERN.sub(MASKED_EMAIL, str(breadcrumb["message"]))
        if breadcrumb.get("data"):
            for key, value in breadcrumb["data"].items():
                if isinstance(value, str):
                    breadcrumb["data"][key] = EMAIL_PATTERN.sub(MASKED_EMAIL, value)

    return event
