"""Morning brief read endpoints."""

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from auth.dependencies import get_current_user
from brief.schemas import BriefResponse, SnoozeMissionRequest
from brief import service as brief_service
from middleware.rate_limit import get_user_key, limiter

logger = structlog.get_logger()

router = APIRouter(prefix="/api/brief", tags=["brief"])
ON_DEMAND_RATE_LIMIT = "3/hour"


@router.get("/today", status_code=200)
@limiter.limit(ON_DEMAND_RATE_LIMIT, key_func=get_user_key)
async def get_today_brief(request: Request, user: dict = Depends(get_current_user)) -> dict:
    """Return today's morning brief, generating on demand when missing."""
    user_id = str(user["_id"])
    payload = await brief_service.get_today_brief_response(user_id, allow_generate=True)
    if payload is None:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "BRIEF_GENERATION_LIMIT",
                "message": "On-demand brief generation limit reached. Try again later.",
            },
        )
    return {"data": BriefResponse.from_payload(payload)}


@router.post("/missions/{mission_id}/snooze", status_code=200)
async def snooze_mission(
    mission_id: str,
    body: SnoozeMissionRequest | None = None,
    user: dict = Depends(get_current_user),
) -> dict:
    """Snooze a mission until later (default: end of next local day)."""
    user_id = str(user["_id"])
    until = body.until if body else None
    state = await brief_service.snooze_mission_for_user(user_id, mission_id, until=until)
    return {"data": state}


@router.post("/missions/{mission_id}/done", status_code=200)
async def complete_mission(
    mission_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    """Mark a mission as done for today."""
    user_id = str(user["_id"])
    state = await brief_service.complete_mission_for_user(user_id, mission_id)
    return {"data": state}


@router.get("/history", status_code=200)
async def get_brief_history(
    user: dict = Depends(get_current_user),
    days: int = Query(7, ge=1, le=30),
) -> dict:
    """Return stored morning briefs for the past N days."""
    user_id = str(user["_id"])
    items = await brief_service.get_brief_history(user_id, days)
    return {"data": items, "meta": {"days": days}}
