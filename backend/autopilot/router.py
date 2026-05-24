"""HTTP route handlers for autopilot pending opportunities."""

from fastapi import APIRouter, Depends, HTTPException, Request

from auth.dependencies import get_verified_user as get_current_user
from autopilot.constants import AUTOPILOT_ACTION_RATE_LIMIT
from autopilot.schemas import ApproveResponse, PendingOpportunityResponse
from autopilot.service import (
    PendingOpportunityInvalidStateError,
    PendingOpportunityNotFoundError,
    approve_pending_opportunity,
    dismiss_pending_opportunity,
    get_pending_opportunity,
    list_pending_opportunities,
)
from middleware.rate_limit import get_user_key, limiter

router = APIRouter(prefix="/api/autopilot", tags=["autopilot"])

NOT_FOUND_DETAIL = {"code": "PENDING_NOT_FOUND", "message": "Pending opportunity not found."}
INVALID_STATE_DETAIL = {"code": "INVALID_STATE", "message": "Opportunity is not pending review."}


@router.get("/pending", status_code=200)
async def list_pending(user: dict = Depends(get_current_user)) -> dict:
    items = await list_pending_opportunities(str(user["_id"]))
    return {"data": items}


@router.get("/pending/{opportunity_id}", status_code=200)
async def get_pending(opportunity_id: str, user: dict = Depends(get_current_user)) -> dict:
    try:
        item = await get_pending_opportunity(str(user["_id"]), opportunity_id)
    except PendingOpportunityNotFoundError:
        raise HTTPException(status_code=404, detail=NOT_FOUND_DETAIL)
    return {"data": item}


@router.post("/pending/{opportunity_id}/approve", status_code=200)
@limiter.limit(AUTOPILOT_ACTION_RATE_LIMIT, key_func=get_user_key)
async def approve_pending(
    request: Request,  # noqa: ARG001
    opportunity_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    try:
        opp_id, app_id = await approve_pending_opportunity(str(user["_id"]), opportunity_id)
    except PendingOpportunityNotFoundError:
        raise HTTPException(status_code=404, detail=NOT_FOUND_DETAIL)
    except PendingOpportunityInvalidStateError:
        raise HTTPException(status_code=409, detail=INVALID_STATE_DETAIL)
    return {"data": ApproveResponse(opportunity_id=opp_id, application_id=app_id)}


@router.post("/pending/{opportunity_id}/dismiss", status_code=200)
@limiter.limit(AUTOPILOT_ACTION_RATE_LIMIT, key_func=get_user_key)
async def dismiss_pending(
    request: Request,  # noqa: ARG001
    opportunity_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    try:
        await dismiss_pending_opportunity(str(user["_id"]), opportunity_id)
    except PendingOpportunityNotFoundError:
        raise HTTPException(status_code=404, detail=NOT_FOUND_DETAIL)
    except PendingOpportunityInvalidStateError:
        raise HTTPException(status_code=409, detail=INVALID_STATE_DETAIL)
    return {"data": {"message": "Dismissed"}}
