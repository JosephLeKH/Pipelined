"""Notification route handlers."""

from fastapi import APIRouter, Depends, HTTPException

from auth.dependencies import get_current_user
from notifications import notification_service as svc
from notifications.schemas import NotificationResponse, UnreadCountResponse

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(
    unread_only: bool = False,
    user: dict = Depends(get_current_user),
) -> dict:
    docs = await svc.list_notifications(user["_id"], unread_only=unread_only)
    return {"data": [NotificationResponse.from_doc(d) for d in docs]}


@router.get("/unread-count")
async def unread_count(
    user: dict = Depends(get_current_user),
) -> dict:
    count = await svc.get_unread_count(user["_id"])
    return {"data": UnreadCountResponse(count=count)}


@router.patch("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    updated = await svc.mark_read(user["_id"], notification_id)
    if not updated:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOTIFICATION_NOT_FOUND", "message": "Notification not found."}})
    return {"data": {"ok": True}}


@router.patch("/read-all")
async def mark_all_read(
    user: dict = Depends(get_current_user),
) -> dict:
    count = await svc.mark_all_read(user["_id"])
    return {"data": {"marked": count}}
