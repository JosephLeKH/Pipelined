"""Morning brief read endpoints."""

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from auth.dependencies import get_current_user
from brief.schemas import BriefResponse
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
    doc = await brief_service.get_today_brief(user_id, allow_generate=True)
    if doc is None:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "BRIEF_GENERATION_LIMIT",
                "message": "On-demand brief generation limit reached. Try again later.",
            },
        )
    return {"data": BriefResponse.from_doc(doc)}


@router.get("/history", status_code=200)
async def get_brief_history(
    user: dict = Depends(get_current_user),
    days: int = Query(7, ge=1, le=30),
) -> dict:
    """Return stored morning briefs for the past N days."""
    user_id = str(user["_id"])
    items = await brief_service.get_brief_history(user_id, days)
    return {"data": items, "meta": {"days": days}}
