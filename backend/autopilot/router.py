"""HTTP route handlers for autopilot pending opportunities."""

from fastapi import APIRouter, Depends, HTTPException, Request

from auth.dependencies import get_verified_user as get_current_user
from autopilot.constants import AUTOPILOT_ACTION_RATE_LIMIT
from autopilot.schemas import AddToWatchlistResponse, ApproveResponse, PendingOpportunityResponse
from autopilot.service import (
    PendingOpportunityInvalidStateError,
    PendingOpportunityNotFoundError,
    RecruiterLeadInvalidStateError,
    RecruiterLeadNotFoundError,
    add_recruiter_lead_to_watchlist,
    approve_pending_opportunity,
    dismiss_pending_opportunity,
    dismiss_recruiter_lead,
    get_pending_opportunity,
    list_pending_opportunities,
    list_pending_recruiter_leads,
)
from middleware.rate_limit import get_user_key, limiter

router = APIRouter(prefix="/api/autopilot", tags=["autopilot"])

NOT_FOUND_DETAIL = {"code": "PENDING_NOT_FOUND", "message": "Pending opportunity not found."}
INVALID_STATE_DETAIL = {"code": "INVALID_STATE", "message": "Opportunity is not pending review."}
LEAD_NOT_FOUND_DETAIL = {"code": "LEAD_NOT_FOUND", "message": "Recruiter lead not found."}
LEAD_INVALID_STATE_DETAIL = {"code": "LEAD_INVALID_STATE", "message": "Lead is not in pending state."}


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
        opp_id, app_id, warnings = await approve_pending_opportunity(str(user["_id"]), opportunity_id)
    except PendingOpportunityNotFoundError:
        raise HTTPException(status_code=404, detail=NOT_FOUND_DETAIL)
    except PendingOpportunityInvalidStateError:
        raise HTTPException(status_code=409, detail=INVALID_STATE_DETAIL)
    return {"data": ApproveResponse(opportunity_id=opp_id, application_id=app_id, warnings=warnings)}


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


@router.get("/recruiter-leads", status_code=200)
async def list_recruiter_leads(user: dict = Depends(get_current_user)) -> dict:
    items = await list_pending_recruiter_leads(str(user["_id"]))
    return {"data": items}


@router.post("/recruiter-leads/{lead_id}/add-to-watchlist", status_code=200)
@limiter.limit(AUTOPILOT_ACTION_RATE_LIMIT, key_func=get_user_key)
async def add_lead_to_watchlist(
    request: Request,  # noqa: ARG001
    lead_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    try:
        lid, company = await add_recruiter_lead_to_watchlist(str(user["_id"]), lead_id)
    except RecruiterLeadNotFoundError:
        raise HTTPException(status_code=404, detail=LEAD_NOT_FOUND_DETAIL)
    except RecruiterLeadInvalidStateError:
        raise HTTPException(status_code=409, detail=LEAD_INVALID_STATE_DETAIL)
    return {"data": AddToWatchlistResponse(lead_id=lid, company=company)}


@router.post("/recruiter-leads/{lead_id}/dismiss", status_code=200)
@limiter.limit(AUTOPILOT_ACTION_RATE_LIMIT, key_func=get_user_key)
async def dismiss_lead(
    request: Request,  # noqa: ARG001
    lead_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    try:
        await dismiss_recruiter_lead(str(user["_id"]), lead_id)
    except RecruiterLeadNotFoundError:
        raise HTTPException(status_code=404, detail=LEAD_NOT_FOUND_DETAIL)
    except RecruiterLeadInvalidStateError:
        raise HTTPException(status_code=409, detail=LEAD_INVALID_STATE_DETAIL)
    return {"data": {"message": "Dismissed"}}
