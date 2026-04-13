"""Server-side analytics helpers — fire-and-forget events to PostHog."""

import structlog
import httpx

from config import settings

logger = structlog.get_logger()

POSTHOG_CAPTURE_URL = "https://app.posthog.com/capture/"


async def track_server_event(
    event: str,
    user_id: str,
    properties: dict | None = None,
) -> None:
    """Send a server-side event to PostHog.

    No-op when POSTHOG_API_KEY is not configured.
    Failures are logged but never propagated — analytics must not break the app.
    """
    if not settings.posthog_api_key:
        return

    payload = {
        "api_key": settings.posthog_api_key,
        "event": event,
        "distinct_id": user_id,
        "properties": properties or {},
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(POSTHOG_CAPTURE_URL, json=payload)
    except Exception:
        logger.warning("posthog_event_failed", event=event, user_id=user_id)
