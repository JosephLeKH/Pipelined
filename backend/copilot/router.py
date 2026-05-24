"""Co-pilot chat SSE route handlers."""

import json

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from ai.openrouter_client import agent_llm_configured
from auth.dependencies import get_verified_user as get_current_user
from copilot.constants import COPILOT_RATE_LIMIT
from copilot.schemas import CopilotChatRequest
from copilot import service as copilot_service
from middleware.rate_limit import get_user_key, limiter

logger = structlog.get_logger()

router = APIRouter(prefix="/api/copilot", tags=["copilot"])


@router.post("/chat")
@limiter.limit(COPILOT_RATE_LIMIT, key_func=get_user_key)
async def copilot_chat(
    request: Request,  # noqa: ARG001
    body: CopilotChatRequest,
    user: dict = Depends(get_current_user),
) -> StreamingResponse:
    """Stream a grounded co-pilot reply as Server-Sent Events."""
    if not agent_llm_configured():
        raise HTTPException(status_code=503, detail="AI features not configured")

    user_id = str(user["_id"])

    async def event_stream():
        try:
            async for event in copilot_service.stream_copilot_reply(user_id, body):
                event_type = event.pop("type")
                yield f"event: {event_type}\ndata: {json.dumps(event)}\n\n"
        except Exception as exc:
            logger.exception("copilot_chat_stream_error", user_id=user_id, error=str(exc))
            payload = json.dumps({"message": "An unexpected error occurred."})
            yield f"event: error\ndata: {payload}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
