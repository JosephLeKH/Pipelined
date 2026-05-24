"""Email integration route handlers."""

import urllib.parse

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse

from auth.dependencies import get_current_user, get_verified_user
from config import settings
from email_integration import service as email_service
from email_integration.schemas import (
    EmailAutomationSettings,
    EmailSyncResult,
    GmailAuthUrl,
    GmailConnectionStatus,
)
from middleware.rate_limit import limiter

logger = structlog.get_logger()

router = APIRouter(prefix="/api/email", tags=["email"])

_SETTINGS_ERROR_URL = (
    f"{settings.frontend_url}/settings?section=integrations&error=gmail_auth_failed"
)


@router.get("/auth", response_model=GmailAuthUrl)
async def get_auth_url(
    email_hint: str = Query(default=""),
    user: dict = Depends(get_verified_user),
) -> dict:
    """Return a Gmail OAuth authorization URL for the current user."""
    user_id = str(user["_id"])
    if email_hint:
        url = email_service.build_auth_url_with_hint(user_id, email_hint)
    else:
        url = email_service.build_auth_url(user_id)
    return {"auth_url": url}


@router.get("/callback")
async def gmail_callback(
    code: str = Query(default=""),
    state: str = Query(default=""),
    error: str = Query(default=""),
) -> RedirectResponse:
    """Handle Gmail OAuth callback from Google. Stores tokens, redirects to frontend."""
    if error or not code or not state:
        logger.warning("gmail_callback_denied_or_missing", error=error)
        return RedirectResponse(url=_SETTINGS_ERROR_URL)

    try:
        user_id, token_data = await email_service.exchange_code(code, state)
    except email_service.GmailOAuthError as exc:
        logger.error("gmail_exchange_failed", error=str(exc))
        return RedirectResponse(url=_SETTINGS_ERROR_URL)

    gmail_email = await email_service.store_gmail_tokens(user_id, token_data)

    success_url = (
        f"{settings.frontend_url}/dashboard"
        f"?gmail_connected=1&email={urllib.parse.quote(gmail_email)}"
    )
    return RedirectResponse(url=success_url)


@router.get("/status", response_model=GmailConnectionStatus)
async def get_status(user: dict = Depends(get_current_user)) -> dict:
    """Return the current Gmail connection status for the authenticated user."""
    return email_service.get_connection_status(user)


@router.post("/sync", response_model=EmailSyncResult)
@limiter.limit("3/15minutes")
async def trigger_sync(
    request: Request,
    user: dict = Depends(get_verified_user),
) -> dict:
    """Trigger a manual Gmail sync for the current user."""
    if not user.get("gmail_access_token"):
        raise HTTPException(
            status_code=400,
            detail={"code": "GMAIL_NOT_CONNECTED", "message": "Gmail is not connected."},
        )
    try:
        result = await email_service.sync_emails(user)
        return result
    except email_service.GmailSyncError as exc:
        raise HTTPException(
            status_code=502,
            detail={"code": "GMAIL_SYNC_FAILED", "message": str(exc)},
        )


@router.patch("/settings")
async def update_settings(
    body: EmailAutomationSettings,
    user: dict = Depends(get_verified_user),
) -> dict:
    """Update Gmail automation settings."""
    if not user.get("gmail_access_token"):
        raise HTTPException(
            status_code=400,
            detail={"code": "GMAIL_NOT_CONNECTED", "message": "Gmail is not connected."},
        )
    await email_service.update_settings(str(user["_id"]), body.model_dump(exclude_none=True))
    return {"data": {"ok": True}}


@router.delete("/disconnect", status_code=204)
async def disconnect(user: dict = Depends(get_verified_user)) -> None:
    """Revoke Gmail tokens and disconnect the inbox."""
    await email_service.disconnect(user)
