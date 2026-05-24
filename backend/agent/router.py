"""Agent activity route handlers."""

from fastapi import APIRouter, Depends, Query

from agent import service as agent_service
from agent.schemas import DEFAULT_ACTIVITY_LIMIT, MAX_ACTIVITY_LIMIT
from auth.dependencies import get_verified_user as get_current_user

router = APIRouter(prefix="/api/agent", tags=["agent"])


@router.get("/activity")
async def get_agent_activity(
    limit: int = Query(default=DEFAULT_ACTIVITY_LIMIT, ge=1, le=MAX_ACTIVITY_LIMIT),
    application_id: str | None = Query(default=None),
    user: dict = Depends(get_current_user),
) -> dict:
    """Return recent agent runs for the authenticated user."""
    user_id = str(user["_id"])
    entries = await agent_service.get_agent_activity(
        user_id,
        limit=limit,
        application_id=application_id,
    )
    return {"data": entries, "meta": {"limit": limit, "count": len(entries)}}
