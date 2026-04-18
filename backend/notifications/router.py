"""Notification route handlers."""

import json
from typing import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException
from starlette.responses import StreamingResponse
import asyncio

from auth.dependencies import get_verified_user as get_current_user
from notifications import notification_service as svc
from notifications.notification_service import _sse_connections
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


@router.get("/stream")
async def stream_notifications(
    user: dict = Depends(get_current_user),
) -> StreamingResponse:
    """Server-Sent Events endpoint for real-time notifications."""
    user_id_str = str(user["_id"])
    queue: asyncio.Queue = asyncio.Queue(maxsize=100)
    
    # Register this connection
    if user_id_str not in _sse_connections:
        _sse_connections[user_id_str] = []
    _sse_connections[user_id_str].append(queue)
    
    async def generate() -> AsyncIterator[str]:
        """Generate SSE messages from the queue."""
        # Keep-alive task
        keep_alive_task = asyncio.create_task(_keep_alive(queue))
        
        try:
            while True:
                msg = await queue.get()
                
                if msg.get("_keep_alive"):
                    yield ": keep-alive\n\n"
                else:
                    yield f"data: {json.dumps(msg)}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            keep_alive_task.cancel()
            # Clean up connection
            if user_id_str in _sse_connections:
                try:
                    _sse_connections[user_id_str].remove(queue)
                except ValueError:
                    pass
                if not _sse_connections[user_id_str]:
                    del _sse_connections[user_id_str]
    
    return StreamingResponse(generate(), media_type="text/event-stream")


async def _keep_alive(queue: asyncio.Queue) -> None:
    """Send keep-alive messages every 30 seconds."""
    while True:
        try:
            await asyncio.sleep(30)
            await queue.put({"_keep_alive": True})
        except asyncio.CancelledError:
            break
