"""Activity feed route handlers."""

from fastapi import APIRouter, Depends, Query

from auth.dependencies import get_current_user
from activity import service as svc

router = APIRouter(prefix="/api/activity", tags=["activity"])


@router.get("")
async def get_activity_feed(
    days: int = Query(default=svc.DEFAULT_ACTIVITY_DAYS, ge=0, le=svc.MAX_ACTIVITY_DAYS),
    user: dict = Depends(get_current_user),
) -> dict:
    entries, total = await svc.get_activity_feed(user["_id"], days)
    return {"data": entries, "meta": {"total": total, "days": days}}
