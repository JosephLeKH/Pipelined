"""Calendar event route handlers: CRUD endpoints."""

import datetime as dt

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Response

from auth.dependencies import get_current_user
from cal import service as cal_service
from cal.schemas import EventCreate, EventResponse, EventUpdate
from cal.service import ApplicationNotFoundError

logger = structlog.get_logger()

router = APIRouter(prefix="/api/calendar", tags=["calendar"])

EVENT_NOT_FOUND_DETAIL = {"code": "EVENT_NOT_FOUND", "message": "Calendar event not found."}
APP_NOT_FOUND_DETAIL = {"code": "APP_NOT_FOUND", "message": "Application not found for this user."}


@router.post("/events", status_code=201)
async def create_event(
    body: EventCreate,
    user: dict = Depends(get_current_user),
) -> dict:
    """Create a calendar event linked to an application."""
    user_id = str(user["_id"])
    try:
        doc = await cal_service.create_event(user_id, body)
    except ApplicationNotFoundError:
        raise HTTPException(status_code=404, detail=APP_NOT_FOUND_DETAIL)
    return {"data": EventResponse.from_doc(doc)}


@router.get("/events", status_code=200)
async def list_events(
    date_from: dt.date | None = Query(default=None),
    date_to: dt.date | None = Query(default=None),
    user: dict = Depends(get_current_user),
) -> dict:
    """List calendar events for the current user, defaulting to the current month."""
    user_id = str(user["_id"])
    docs = await cal_service.list_events(user_id, date_from, date_to)
    items = [EventResponse.from_doc(d) for d in docs]
    return {"data": items, "meta": {"count": len(items)}}


@router.patch("/events/{event_id}", status_code=200)
async def update_event(
    event_id: str,
    body: EventUpdate,
    user: dict = Depends(get_current_user),
) -> dict:
    """Partially update a calendar event."""
    user_id = str(user["_id"])
    doc = await cal_service.update_event(user_id, event_id, body)
    if doc is None:
        raise HTTPException(status_code=404, detail=EVENT_NOT_FOUND_DETAIL)
    return {"data": EventResponse.from_doc(doc)}


@router.delete("/events/{event_id}", status_code=204)
async def delete_event(
    event_id: str,
    user: dict = Depends(get_current_user),
) -> Response:
    """Delete a calendar event."""
    user_id = str(user["_id"])
    deleted = await cal_service.delete_event(user_id, event_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=EVENT_NOT_FOUND_DETAIL)
    return Response(status_code=204)
