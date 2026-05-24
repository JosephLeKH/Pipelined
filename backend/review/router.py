"""Weekly review read endpoints."""

import structlog
from fastapi import APIRouter, Depends, HTTPException

from auth.dependencies import get_verified_user as get_current_user
from review import service as review_service
from review.schemas import WeeklyReviewResponse

logger = structlog.get_logger()

router = APIRouter(prefix="/api/review", tags=["review"])


@router.get("/weekly", status_code=200)
async def get_weekly_review(user: dict = Depends(get_current_user)) -> dict:
    """Return the current week's pipeline review."""
    user_id = str(user["_id"])
    if user.get("weekly_review_enabled", True) is False:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "WEEKLY_REVIEW_DISABLED",
                "message": "Weekly review is disabled in your settings.",
            },
        )
    doc = await review_service.get_current_weekly_review(user_id, allow_generate=True)
    if doc is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "WEEKLY_REVIEW_NOT_FOUND", "message": "Weekly review not available."},
        )
    return {"data": WeeklyReviewResponse.from_doc(doc)}
