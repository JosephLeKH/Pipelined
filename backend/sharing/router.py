"""Route handlers for pipeline sharing: create, fetch, revoke, and public view."""

import structlog
from fastapi import APIRouter, Depends, HTTPException, Response

from auth.dependencies import get_current_user
from sharing import service as sharing_service
from sharing.schemas import PublicPipelineResponse, ShareResponse
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
    response: Response = None,
) -> None:
    """Revoke the caller's active share link."""
    user_id = str(user["_id"])
    await sharing_service.revoke_share(user_id)


@router.get("/api/public/{slug}", status_code=200)
async def get_public_pipeline(slug: str) -> dict:
    """Return a read-only public snapshot of a user's pipeline (no auth required)."""
    try:
        data = await sharing_service.get_public_pipeline(slug)
    except ShareNotFoundError:
        raise HTTPException(status_code=404, detail=SHARE_NOT_FOUND_DETAIL)
    return {"data": data}
