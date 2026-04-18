"""Route handlers for pipeline sharing: create, fetch, revoke, and public view."""

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request

from auth.dependencies import get_verified_user as get_current_user
from config import settings
from middleware.rate_limit import limiter
from sharing import service as sharing_service
from sharing.schemas import ShareResponse
from sharing.service import ShareNotFoundError

logger = structlog.get_logger()

router = APIRouter(tags=["sharing"])

SHARE_NOT_FOUND_DETAIL = {
    "code": "SHARE_NOT_FOUND",
    "message": "Share link not found or has expired.",
}


@router.post("/api/sharing/create", status_code=201)
async def create_share(user: dict = Depends(get_current_user)) -> dict:
    """Generate a new public share link (deactivates any existing one)."""
    user_id = str(user["_id"])
    doc = await sharing_service.create_share(user_id)
    return {"data": ShareResponse.from_doc(doc)}


@router.get("/api/sharing/my", status_code=200)
async def get_my_share(user: dict = Depends(get_current_user)) -> dict:
    """Return the caller's active share, or null if none exists."""
    user_id = str(user["_id"])
    doc = await sharing_service.get_my_share(user_id)
    return {"data": ShareResponse.from_doc(doc) if doc else None}


@router.delete("/api/sharing/revoke", status_code=204)
async def revoke_share(
    user: dict = Depends(get_current_user),
) -> None:
    """Revoke the caller's active share link."""
    user_id = str(user["_id"])
    await sharing_service.revoke_share(user_id)




@router.post("/api/sharing/timeline", status_code=201)
async def create_timeline_share(user: dict = Depends(get_current_user)) -> dict:
    """Generate a new public timeline share link (deactivates any existing timeline share)."""
    user_id = str(user["_id"])
    doc = await sharing_service.create_share(user_id, share_type="timeline")
    return {"data": ShareResponse.from_doc(doc)}


@router.get("/api/sharing/timeline", status_code=200)
async def get_my_timeline_share(user: dict = Depends(get_current_user)) -> dict:
    """Return the caller's active timeline share, or null if none exists."""
    user_id = str(user["_id"])
    doc = await sharing_service.get_my_share(user_id, share_type="timeline")
    return {"data": ShareResponse.from_doc(doc) if doc else None}


@router.delete("/api/sharing/timeline", status_code=204)
async def revoke_timeline_share(user: dict = Depends(get_current_user)) -> None:
    """Revoke the caller's active timeline share link."""
    user_id = str(user["_id"])
    await sharing_service.revoke_share_by_type(user_id, "timeline")


@router.get("/api/public/timeline/{slug}", status_code=200)
@limiter.limit(settings.rate_limit_standard)
async def get_public_timeline(slug: str, request: Request) -> dict:
    """Return a read-only public timeline snapshot of a user's applications (no auth required)."""
    try:
        data = await sharing_service.get_public_timeline(slug)
    except ShareNotFoundError:
        raise HTTPException(status_code=404, detail=SHARE_NOT_FOUND_DETAIL)
    return {"data": data}


@router.get("/api/public/{slug}", status_code=200)
@limiter.limit(settings.rate_limit_standard)
async def get_public_pipeline(slug: str, request: Request) -> dict:
    """Return a read-only public snapshot of a user's pipeline (no auth required)."""
    try:
        data = await sharing_service.get_public_pipeline(slug)
    except ShareNotFoundError:
        raise HTTPException(status_code=404, detail=SHARE_NOT_FOUND_DETAIL)
    return {"data": data}
