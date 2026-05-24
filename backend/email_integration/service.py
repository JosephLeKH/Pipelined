"""Gmail OAuth flow, token management, and email sync logic."""

import asyncio
import base64
import re
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
import jwt
import structlog
from bson import ObjectId
from bson.errors import InvalidId

from ai.agent_log import (
    AGENT_TYPE_CLASSIFY,
    AGENT_TYPE_PREP,
    STATUS_FAILED,
    STATUS_SUCCESS,
    log_agent_run,
)
from applications.interview_prep.agent import run_agent
from applications.schemas import ApplicationCreate, ApplicationUpdate, OfferDetails
from applications.service import DuplicateApplicationError
from applications.service import create as create_application
from applications.service import update as update_application
from config import settings
from database import get_collection
from email_integration.classifier import GmailTransientError, classify_email, normalize_interview_round
from email_integration.email_events import log_email_event
from email_integration.offer_parser import extract_offer_details

logger = structlog.get_logger()

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke"
GMAIL_MESSAGES_URL = "https://www.googleapis.com/gmail/v1/users/me/messages"
GMAIL_MESSAGE_URL = "https://www.googleapis.com/gmail/v1/users/me/messages/{}"
GMAIL_PROFILE_URL = "https://www.googleapis.com/gmail/v1/users/me/profile"
GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"

JWT_ALGORITHM = "HS256"
STATE_TOKEN_TTL_MINUTES = 15
TOKEN_REFRESH_BUFFER_SECONDS = 300

SYNC_SEARCH_QUERY = (
    "subject:(application interview offer rejection assessment online) newer_than:30d"
)
SYNC_MAX_MESSAGES = 50

STAGE_MAP: dict[str, str] = {
    "Applied": "Applied",
    "Assessment": "OA",
    "Phone Screen": "Phone Screen",
    "Interview": "Interviewing",
    "Offer": "Offer",
    "Rejected": "Rejected",
}

STAGE_ORDER: dict[str, int] = {
    "Applied": 1,
    "OA": 2,
    "Phone Screen": 3,
    "Interviewing": 4,
    "Offer": 5,
    "Rejected": 6,
}

PROCESSED_IDS_LIMIT = 500
GMAIL_ACTIVITY_LIMIT = 5
GMAIL_ACTIVITY_COLLECTION = "gmail_activity"

DEFAULT_GMAIL_INTERVIEW_PREP = True
INTERVIEW_PREP_RETRIGGER_HOURS = 24
INTERVIEW_PREP_STATUS_GENERATING = "generating"
INTERVIEW_PREP_STATUS_DONE = "done"
INTERVIEW_PREP_STATUS_FAILED = "failed"


class GmailOAuthError(Exception):
    """Raised when Gmail OAuth flow fails."""


class GmailNotConnectedError(Exception):
    """Raised when Gmail is not connected for the user."""


class GmailSyncError(Exception):
    """Raised when Gmail message list request fails."""


class GmailTokenRevokedError(Exception):
    """Raised when Gmail OAuth token has been permanently revoked (invalid_grant)."""


class GmailTokenExpiredError(Exception):
    """Raised when access token is expired and no refresh token is available."""


def _to_oid(user_id: str) -> ObjectId:
    return ObjectId(user_id)


def _build_state_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=STATE_TOKEN_TTL_MINUTES)
    payload = {
        "sub": user_id,
        "exp": int(exp.timestamp()),
        "type": "gmail_state",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM)


def _decode_state_token(state: str) -> str:
    """Return user_id from state JWT. Raises jwt.InvalidTokenError on failure."""
    data = jwt.decode(state, settings.jwt_secret, algorithms=[JWT_ALGORITHM])
    if data.get("type") != "gmail_state":
        raise jwt.InvalidTokenError("Wrong token type in state")
    return data["sub"]


def _build_params(user_id: str, email_hint: str = "") -> dict:
    state = _build_state_token(user_id)
    params: dict = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.gmail_redirect_uri,
        "response_type": "code",
        "scope": GMAIL_SCOPE,
        "access_type": "offline",
        "prompt": "consent select_account",
        "state": state,
    }
    if email_hint:
        params["login_hint"] = email_hint
    return params


def build_auth_url(user_id: str) -> str:
    """Return the Google OAuth authorization URL for the current user."""
    return f"{GOOGLE_AUTH_URL}?{urlencode(_build_params(user_id))}"


def build_auth_url_with_hint(user_id: str, email_hint: str) -> str:
    """Return the Google OAuth URL with a login_hint for the specified address."""
    return f"{GOOGLE_AUTH_URL}?{urlencode(_build_params(user_id, email_hint))}"


async def exchange_code(code: str, state: str) -> tuple[str, dict]:
    """Exchange OAuth code for tokens. Returns (user_id, token_data).

    Raises GmailOAuthError on any failure.
    """
    try:
        user_id = _decode_state_token(state)
    except jwt.InvalidTokenError as exc:
        raise GmailOAuthError("Invalid or expired state token") from exc

    async with httpx.AsyncClient() as http:
        resp = await http.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.gmail_redirect_uri,
                "grant_type": "authorization_code",
            },
        )

    if resp.status_code != 200:
        raise GmailOAuthError(f"Token exchange returned {resp.status_code}")

    token_data = resp.json()
    if "error" in token_data:
        raise GmailOAuthError(f"Token exchange error: {token_data['error']}")

    return user_id, token_data


async def _fetch_gmail_address(access_token: str) -> str:
    """Return the Gmail address for the connected account."""
    async with httpx.AsyncClient() as http:
        resp = await http.get(
            GMAIL_PROFILE_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if resp.status_code == 200:
        return resp.json().get("emailAddress", "")
    return ""


async def store_gmail_tokens(user_id: str, token_data: dict) -> str:
    """Store Gmail tokens in the user document. Returns the connected email address."""
    access_token = token_data["access_token"]
    expires_in = int(token_data.get("expires_in", 3600))

    gmail_email = await _fetch_gmail_address(access_token)

    expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    fields: dict = {
        "gmail_email": gmail_email,
        "gmail_access_token": access_token,
        "gmail_token_expiry": expiry,
        "gmail_connected_at": datetime.now(timezone.utc),
        "gmail_auto_track": True,
        "gmail_status_updates": True,
        "gmail_interview_prep": DEFAULT_GMAIL_INTERVIEW_PREP,
        "gmail_emails_scanned": 0,
        "gmail_apps_tracked": 0,
    }
    if token_data.get("refresh_token"):
        fields["gmail_refresh_token"] = token_data["refresh_token"]

    users = get_collection("users")
    await users.update_one(
        {"_id": _to_oid(user_id)},
        {"$set": fields},
    )
    logger.info("gmail_tokens_stored", user_id=user_id, gmail_email=gmail_email)
    return gmail_email


def get_connection_status(user: dict) -> dict:
    """Build a status dict from a user document for GmailConnectionStatus."""
    connected = bool(user.get("gmail_access_token"))
    return {
        "connected": connected,
        "email": user.get("gmail_email") if connected else None,
        "connected_at": user.get("gmail_connected_at"),
        "last_sync_at": user.get("gmail_last_sync_at"),
        "emails_scanned": user.get("gmail_emails_scanned", 0),
        "apps_tracked": user.get("gmail_apps_tracked", 0),
        "status_updates_count": user.get("gmail_status_updates_count", 0),
        "auto_track": user.get("gmail_auto_track", True),
        "status_updates": user.get("gmail_status_updates", True),
        "interview_prep": user.get("gmail_interview_prep", DEFAULT_GMAIL_INTERVIEW_PREP),
    }


async def _refresh_access_token(user_id: str, refresh_token: str) -> str:
    """Refresh the access token and persist it. Returns new access token."""
    async with httpx.AsyncClient() as http:
        resp = await http.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
    data = resp.json()
    if resp.status_code != 200 or "error" in data:
        if data.get("error") == "invalid_grant":
            raise GmailTokenRevokedError("Gmail refresh token revoked (invalid_grant)")
        raise GmailSyncError(f"Token refresh failed: {data.get('error', resp.status_code)}")

    new_token: str = data["access_token"]
    expires_in = int(data.get("expires_in", 3600))
    expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    users = get_collection("users")
    await users.update_one(
        {"_id": _to_oid(user_id)},
        {"$set": {"gmail_access_token": new_token, "gmail_token_expiry": expiry}},
    )
    return new_token


async def _get_valid_access_token(user: dict) -> str:
    """Return a valid access token, refreshing if within buffer of expiry."""
    access_token: str = user.get("gmail_access_token", "")
    if not access_token:
        raise GmailNotConnectedError("Gmail not connected")

    refresh_token: str = user.get("gmail_refresh_token", "")
    expiry = user.get("gmail_token_expiry")

    if expiry:
        if isinstance(expiry, datetime) and expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        threshold = datetime.now(timezone.utc) + timedelta(seconds=TOKEN_REFRESH_BUFFER_SECONDS)
        if isinstance(expiry, datetime) and expiry < threshold:
            if not refresh_token:
                raise GmailTokenExpiredError("Access token expired and no refresh token available")
            access_token = await _refresh_access_token(str(user["_id"]), refresh_token)

    return access_token


def _decode_body(payload: dict) -> str:
    """Extract plain-text body from a Gmail message payload."""
    body_data = payload.get("body", {}).get("data", "")
    if body_data:
        return base64.urlsafe_b64decode(body_data).decode("utf-8", errors="replace")

    for part in payload.get("parts", []):
        if part.get("mimeType") == "text/plain":
            data = part.get("body", {}).get("data", "")
            if data:
                return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")

    for part in payload.get("parts", []):
        data = part.get("body", {}).get("data", "")
        if data:
            return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")

    return ""


async def _apply_offer_details_from_email(
    user_id: str,
    app_id: str,
    subject: str,
    body: str,
) -> None:
    """Extract offer_details from an offer letter email and merge onto the application."""
    extracted = await extract_offer_details(subject, body)
    if not extracted:
        return

    apps = get_collection("applications")
    existing = await apps.find_one(
        {"_id": _to_oid(app_id), "user_id": _to_oid(user_id)},
        {"offer_details": 1},
    )
    if not existing:
        return

    current = OfferDetails.model_validate(existing.get("offer_details") or {})
    merged = {**current.model_dump(exclude_none=True), **extracted}
    update = ApplicationUpdate.model_construct(
        _fields_set={"offer_details"},
        offer_details=OfferDetails.model_validate(merged),
    )
    await update_application(user_id, app_id, update)
    logger.info("offer_details_extracted_from_email", user_id=user_id, app_id=app_id)


async def _apply_oa_deadline_from_email(
    user_id: str,
    app_id: str,
    subject: str,
    body: str,
) -> None:
    """Extract OA deadline from assessment email and set application.deadline."""
    extracted = await extract_oa_deadline(subject, body)
    if not extracted:
        return

    apps = get_collection("applications")
    existing = await apps.find_one(
        {"_id": _to_oid(app_id), "user_id": _to_oid(user_id)},
        {"deadline": 1},
    )
    if not existing:
        return

    update = ApplicationUpdate.model_construct(
        _fields_set={"deadline"},
        deadline=extracted,
    )
    await update_application(user_id, app_id, update)
    logger.info("oa_deadline_extracted_from_email", user_id=user_id, app_id=app_id)


async def _record_email_event(
    user_id: str,
    *,
    event_type: str,
    application_id: str | None,
    company: str,
    role_title: str | None,
    stage: str,
    subject: str,
) -> None:
    """Persist a privacy-safe email event (no body) for the application timeline."""
    await log_email_event(
        user_id,
        event_type=event_type,
        application_id=application_id,
        company=company,
        role_title=role_title,
        stage=stage,
        subject=subject,
    )


async def _find_existing_app(user_id: str, company: str, role_title: str) -> dict | None:
    """Find an existing application by case-insensitive company + role_title match."""
    try:
        uid = ObjectId(user_id)
    except (ValueError, InvalidId):
        return None

    apps = get_collection("applications")
    query: dict = {
        "user_id": uid,
        "deleted": {"$ne": True},
        "company": {"$regex": f"^{re.escape(company)}$", "$options": "i"},
    }
    if role_title:
        query["role_title"] = {"$regex": f"^{re.escape(role_title)}$", "$options": "i"}

    return await apps.find_one(query)


def _application_update_from_classify(stage: str, result: dict) -> ApplicationUpdate:
    """Build an ApplicationUpdate from classifier output, including interview_round when present."""
    interview_round = normalize_interview_round(result.get("interview_round"))
    kwargs: dict = {"current_stage": stage}
    if interview_round:
        kwargs["interview_round"] = interview_round
    return ApplicationUpdate(**kwargs)  # type: ignore[call-arg]


async def _process_message(
    user: dict, access_token: str, message_id: str
) -> tuple[bool, bool]:
    """Fetch, classify, and act on one Gmail message. Returns (created, updated)."""
    user_id = str(user["_id"])

    async with httpx.AsyncClient() as http:
        resp = await http.get(
            GMAIL_MESSAGE_URL.format(message_id),
            headers={"Authorization": f"Bearer {access_token}"},
            params={"format": "full"},
        )

    if resp.status_code != 200:
        return False, False

    msg = resp.json()
    headers = {
        h["name"].lower(): h["value"]
        for h in msg.get("payload", {}).get("headers", [])
    }
    subject = headers.get("subject", "")
    body = _decode_body(msg.get("payload", {}))[:1000]

    try:
        result = await classify_email(subject, body)
    except GmailTransientError:
        logger.warning("email_classify_transient_skip", message_id=message_id)
        return False, False
    if not result:
        return False, False

    await log_agent_run(
        user_id,
        AGENT_TYPE_CLASSIFY,
        STATUS_SUCCESS,
        f"Classified email: {result.get('company', 'Unknown')} — {result.get('stage', 'Applied')}",
    )

    company: str = result.get("company", "")
    role_title: str = result.get("role_title") or ""
    stage = STAGE_MAP.get(result.get("stage", "Applied"), "Applied")
    interview_round = normalize_interview_round(result.get("interview_round"))

    if not company:
        return False, False

    existing = await _find_existing_app(user_id, company, role_title)

    if existing:
        app_id = str(existing["_id"])
        if not user.get("gmail_status_updates", True):
            await _record_email_event(
                user_id,
                event_type="email_classified",
                application_id=app_id,
                company=company,
                role_title=role_title,
                stage=stage,
                subject=subject,
            )
            return False, False

        # Check stage ordering to prevent regression (e.g., Offer -> Applied)
        existing_stage = existing.get("current_stage", "Applied")
        new_stage_order = STAGE_ORDER.get(stage, 0)
        existing_stage_order = STAGE_ORDER.get(existing_stage, 0)

        # Only update if new stage is >= existing stage (or existing stage unknown)
        if existing_stage not in STAGE_ORDER or new_stage_order >= existing_stage_order:
            app_update = _application_update_from_classify(stage, result)
            await update_application(user_id, app_id, app_update)
            logger.info(
                "application_stage_updated_via_email",
                user_id=user_id,
                app_id=app_id,
                company=company,
                role_title=role_title,
                from_stage=existing_stage,
                to_stage=stage,
                source="email",
            )
            await _log_gmail_activity(
                user_id,
                "status_updated",
                application_id=app_id,
                company=company,
                role_title=role_title,
            )
            await _record_email_event(
                user_id,
                event_type="stage_updated",
                application_id=app_id,
                company=company,
                role_title=role_title,
                stage=stage,
                subject=subject,
            )
            if stage == "Offer":
                await _apply_offer_details_from_email(user_id, app_id, subject, body)
            if stage == "OA":
                await _apply_oa_deadline_from_email(user_id, app_id, subject, body)
            if stage == "Interviewing" and user.get(
                "gmail_interview_prep", DEFAULT_GMAIL_INTERVIEW_PREP
            ):
                asyncio.create_task(
                    _trigger_interview_prep(user_id, app_id, company, role_title)
                )
            return False, True

        await _record_email_event(
            user_id,
            event_type="email_classified",
            application_id=app_id,
            company=company,
            role_title=role_title,
            stage=stage,
            subject=subject,
        )
        return False, False

    if not user.get("gmail_auto_track", True):
        await _record_email_event(
            user_id,
            event_type="email_classified",
            application_id=None,
            company=company,
            role_title=role_title,
            stage=stage,
            subject=subject,
        )
        return False, False

    try:
        app_body = ApplicationCreate(  # type: ignore[call-arg]
            company=company,
            role_title=role_title or None,
            source="email",
            current_stage=stage if stage != "Applied" else None,
            interview_round=interview_round,
        )
        new_app = await create_application(user_id, app_body)
        if new_app:
            app_id = str(new_app["_id"])
            logger.info(
                "application_created_via_email",
                user_id=user_id,
                app_id=app_id,
                company=company,
                role_title=role_title,
                source="email",
            )
            await _log_gmail_activity(
                user_id,
                "application_tracked",
                application_id=app_id,
                company=company,
                role_title=role_title,
            )
            await _record_email_event(
                user_id,
                event_type="application_tracked",
                application_id=app_id,
                company=company,
                role_title=role_title,
                stage=stage,
                subject=subject,
            )
            if stage == "Offer":
                await _apply_offer_details_from_email(user_id, app_id, subject, body)
            if stage == "OA":
                await _apply_oa_deadline_from_email(user_id, app_id, subject, body)
            if stage == "Interviewing" and user.get(
                "gmail_interview_prep", DEFAULT_GMAIL_INTERVIEW_PREP
            ):
                asyncio.create_task(
                    _trigger_interview_prep(user_id, app_id, company, role_title)
                )
            asyncio.create_task(_trigger_fit_score(user_id, app_id, company, role_title))
        return True, False
    except DuplicateApplicationError:
        return False, False


async def _should_skip_interview_prep_retrigger(user_id: str, app_id: str) -> bool:
    """Return True when prep was triggered within the dedupe window or is in progress."""
    apps = get_collection("applications")
    app = await apps.find_one(
        {"_id": _to_oid(app_id), "user_id": _to_oid(user_id)},
        {"interview_prep_status": 1, "interview_prep_triggered_at": 1},
    )
    if not app:
        return True
    if app.get("interview_prep_status") == INTERVIEW_PREP_STATUS_GENERATING:
        return True
    triggered_at = app.get("interview_prep_triggered_at")
    if triggered_at is None:
        return False
    if triggered_at.tzinfo is None:
        triggered_at = triggered_at.replace(tzinfo=timezone.utc)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=INTERVIEW_PREP_RETRIGGER_HOURS)
    return triggered_at >= cutoff


async def _trigger_interview_prep(
    user_id: str, app_id: str, company: str, role: str
) -> None:
    """Run interview prep agent in background and persist briefing to the application."""
    if await _should_skip_interview_prep_retrigger(user_id, app_id):
        logger.info("interview_prep_retrigger_skipped", app_id=app_id, user_id=user_id)
        return

    apps = get_collection("applications")
    now = datetime.now(timezone.utc)
    await apps.update_one(
        {"_id": _to_oid(app_id), "user_id": _to_oid(user_id)},
        {
            "$set": {
                "interview_prep_status": INTERVIEW_PREP_STATUS_GENERATING,
                "interview_prep_triggered_at": now,
            }
        },
    )

    users = get_collection("users")
    user_doc = await users.find_one({"_id": _to_oid(user_id)}, {"resume_text": 1})
    resume_text = (user_doc or {}).get("resume_text", "")
    app = await apps.find_one(
        {"_id": _to_oid(app_id), "user_id": _to_oid(user_id)},
        {"interview_round": 1},
    )
    interview_round = (app or {}).get("interview_round")
    try:
        async for event in run_agent(
            company=company,
            role=role,
            resume_text=resume_text,
            gemini_api_key=settings.gemini_api_key,
            exa_api_key=settings.exa_api_key,
            interview_round=interview_round,
        ):
            if event.get("type") == "done":
                await apps.update_one(
                    {"_id": _to_oid(app_id), "user_id": _to_oid(user_id)},
                    {
                        "$set": {
                            "interview_prep_briefing": event.get("briefing"),
                            "interview_prep_generated_at": now,
                            "interview_prep_status": INTERVIEW_PREP_STATUS_DONE,
                        }
                    },
                )
                await log_agent_run(
                    user_id,
                    AGENT_TYPE_PREP,
                    STATUS_SUCCESS,
                    f"Interview prep ready for {company}",
                    application_id=app_id,
                )
                from notifications.notification_service import create_notification  # noqa: PLC0415

                role_label = role or "your role"
                await create_notification(
                    _to_oid(user_id),
                    type="interview_prep_ready",
                    title=f"Interview prep ready: {company}",
                    body=f"Your briefing for {role_label} at {company} is ready.",
                    action_url=f"/dashboard?selected={app_id}",
                )
                break
    except Exception:
        logger.exception("interview_prep_auto_trigger_error", app_id=app_id)
        await apps.update_one(
            {"_id": _to_oid(app_id), "user_id": _to_oid(user_id)},
            {"$set": {"interview_prep_status": INTERVIEW_PREP_STATUS_FAILED}},
        )
        await log_agent_run(
            user_id,
            AGENT_TYPE_PREP,
            STATUS_FAILED,
            f"Interview prep failed for {company}",
            application_id=app_id,
        )


async def _trigger_fit_score(
    user_id: str, app_id: str, company: str, role: str
) -> None:
    """Compute fit score in background for a newly created application."""
    log = structlog.get_logger()
    try:
        from applications.interview_prep.fit_score import compute_fit_score  # noqa: PLC0415

        resume_text = ""
        user_doc = await get_collection("users").find_one(
            {"_id": _to_oid(user_id)}, {"resume_text": 1}
        )
        if user_doc:
            resume_text = user_doc.get("resume_text", "")
        await compute_fit_score(user_id, app_id, company, role, resume_text)
    except Exception:
        log.warning("fit_score_trigger_failed", app_id=app_id)



async def _log_gmail_activity(
    user_id: str,
    event_type: str,
    *,
    application_id: str | None = None,
    company: str | None = None,
    role_title: str | None = None,
) -> None:
    """Persist a privacy-safe Gmail classification event (no email body)."""
    await get_collection(GMAIL_ACTIVITY_COLLECTION).insert_one({
        "user_id": _to_oid(user_id),
        "event_type": event_type,
        "timestamp": datetime.now(timezone.utc),
        "application_id": application_id,
        "company": company,
        "role_title": role_title or None,
    })


async def get_recent_gmail_activity(user_id: str, limit: int = GMAIL_ACTIVITY_LIMIT) -> list[dict]:
    """Return the most recent Gmail classification events for the user."""
    cursor = (
        get_collection(GMAIL_ACTIVITY_COLLECTION)
        .find({"user_id": _to_oid(user_id)})
        .sort("timestamp", -1)
        .limit(limit)
    )
    events = []
    async for doc in cursor:
        events.append({
            "event_type": doc.get("event_type", "unknown"),
            "timestamp": doc.get("timestamp"),
            "application_id": doc.get("application_id"),
            "company": doc.get("company"),
            "role_title": doc.get("role_title"),
        })
    return events

async def sync_emails(user: dict) -> dict:
    """Fetch and process recent job emails. Returns sync result dict."""
    user_id = str(user["_id"])
    access_token = await _get_valid_access_token(user)

    async with httpx.AsyncClient() as http:
        resp = await http.get(
            GMAIL_MESSAGES_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            params={"q": SYNC_SEARCH_QUERY, "maxResults": SYNC_MAX_MESSAGES},
        )

    if resp.status_code != 200:
        raise GmailSyncError(f"Gmail message list returned {resp.status_code}")

    messages = resp.json().get("messages", [])

    users = get_collection("users")
    user_fresh = await users.find_one({"_id": user["_id"]}, {"gmail_processed_ids": 1})
    already_processed: set[str] = set((user_fresh or {}).get("gmail_processed_ids", []))

    new_messages = [m for m in messages if m["id"] not in already_processed]

    created = 0
    updated = 0
    for msg in new_messages:
        msg_created, msg_updated = await _process_message(user, access_token, msg["id"])
        if msg_created:
            created += 1
        if msg_updated:
            updated += 1

    processed = len(new_messages)

    if new_messages:
        new_ids = [m["id"] for m in new_messages]
        await users.update_one(
            {"_id": user["_id"]},
            {"$push": {"gmail_processed_ids": {"$each": new_ids, "$slice": -PROCESSED_IDS_LIMIT}}},
        )

    await users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"gmail_last_sync_at": datetime.now(timezone.utc)},
            "$inc": {
                "gmail_emails_scanned": processed,
                "gmail_apps_tracked": created,
                "gmail_status_updates_count": updated,
            },
        },
    )

    logger.info(
        "gmail_sync_complete",
        user_id=user_id,
        processed=processed,
        created=created,
        updated=updated,
    )
    return {"emails_processed": processed, "apps_created": created, "apps_updated": updated}


async def update_settings(user_id: str, patch: dict) -> None:
    """Update Gmail automation settings in the user document."""
    field_map = {
        "auto_track": "gmail_auto_track",
        "status_updates": "gmail_status_updates",
        "interview_prep": "gmail_interview_prep",
    }
    update = {field_map[k]: v for k, v in patch.items() if k in field_map}
    if update:
        users = get_collection("users")
        await users.update_one({"_id": _to_oid(user_id)}, {"$set": update})


async def disconnect(user: dict) -> None:
    """Revoke Gmail token and clear all Gmail fields from the user document."""
    token = user.get("gmail_refresh_token") or user.get("gmail_access_token", "")
    if token:
        try:
            async with httpx.AsyncClient() as http:
                await http.post(GOOGLE_REVOKE_URL, params={"token": token})
        except Exception:
            logger.warning("gmail_revoke_failed", user_id=str(user["_id"]))

    users = get_collection("users")
    await users.update_one(
        {"_id": user["_id"]},
        {
            "$unset": {
                "gmail_email": "",
                "gmail_access_token": "",
                "gmail_refresh_token": "",
                "gmail_token_expiry": "",
                "gmail_connected_at": "",
                "gmail_last_sync_at": "",
                "gmail_auto_track": "",
                "gmail_status_updates": "",
                "gmail_interview_prep": "",
                "gmail_emails_scanned": "",
                "gmail_apps_tracked": "",
                "gmail_status_updates_count": "",
            }
        },
    )
    logger.info("gmail_disconnected", user_id=str(user["_id"]))
