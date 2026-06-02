"""Autopilot business logic for pending opportunities."""

from datetime import datetime, timezone

import structlog
from applications.schemas import ApplicationCreate
from applications.service import DuplicateApplicationError, create as create_application
from autopilot.constants import (
    ADDED_TO_WATCHLIST_STATUS,
    APPROVED_STATUS,
    AUTOPILOT_APPLICATION_STAGE,
    DISMISSED_STATUS,
    PENDING_STATUS,
)
from autopilot.schemas import PendingOpportunityResponse, RecruiterLeadResponse
from bson import ObjectId
from bson.errors import InvalidId
from database import get_collection
from email_integration.recruiter_outreach import (
    get_recruiter_lead,
    list_recruiter_leads,
    set_lead_status,
)

logger = structlog.get_logger()


class PendingOpportunityNotFoundError(Exception):
    """Raised when a pending opportunity is not found for this user."""


class PendingOpportunityInvalidStateError(Exception):
    """Raised when an opportunity is not in pending status."""


async def _fetch_listing_map(listing_ids: list[ObjectId]) -> dict[ObjectId, dict]:
    if not listing_ids:
        return {}
    docs = await get_collection("job_listings").find({"_id": {"$in": listing_ids}}).to_list(length=len(listing_ids))
    return {doc["_id"]: doc for doc in docs}


async def list_pending_opportunities(user_id: str) -> list[PendingOpportunityResponse]:
    uid = ObjectId(user_id)
    col = get_collection("pending_opportunities")
    docs = await col.find({"user_id": uid, "status": PENDING_STATUS}).sort("created_at", -1).to_list(length=100)
    listing_map = await _fetch_listing_map([doc["job_listing_id"] for doc in docs])
    return [
        PendingOpportunityResponse.from_doc(doc, listing_map.get(doc["job_listing_id"]))
        for doc in docs
    ]


async def get_pending_opportunity(user_id: str, opportunity_id: str) -> PendingOpportunityResponse:
    doc = await _get_pending_doc(user_id, opportunity_id)
    listing = await get_collection("job_listings").find_one({"_id": doc["job_listing_id"]})
    return PendingOpportunityResponse.from_doc(doc, listing)


async def _get_pending_doc(user_id: str, opportunity_id: str) -> dict:
    try:
        oid = ObjectId(opportunity_id)
        uid = ObjectId(user_id)
    except InvalidId as exc:
        raise PendingOpportunityNotFoundError from exc

    doc = await get_collection("pending_opportunities").find_one({"_id": oid, "user_id": uid})
    if doc is None:
        raise PendingOpportunityNotFoundError
    return doc


async def approve_pending_opportunity(user_id: str, opportunity_id: str) -> tuple[str, str, list[str]]:
    """Approve a pending opportunity and create a To Apply application.

    Returns: (opportunity_id, application_id, warnings)
    Warnings may include "apply_pack_attach_failed" if secondary update fails.
    """
    doc = await _get_pending_doc(user_id, opportunity_id)
    if doc["status"] != PENDING_STATUS:
        raise PendingOpportunityInvalidStateError

    listing = await get_collection("job_listings").find_one({"_id": doc["job_listing_id"]})
    if listing is None:
        raise PendingOpportunityNotFoundError

    body = ApplicationCreate(
        role_title=listing.get("role") or "Unknown role",
        company=listing.get("company") or "Unknown company",
        current_stage=AUTOPILOT_APPLICATION_STAGE,
        source=doc.get("source", "autopilot"),
        source_url=listing.get("apply_url"),
        location=listing.get("location"),
        remote_status=listing.get("remote_status"),
        company_type=listing.get("company_type"),
    )

    try:
        app_doc = await create_application(user_id, body)
    except DuplicateApplicationError as exc:
        app_id = exc.existing_id
    else:
        app_id = str(app_doc["_id"])

    warnings: list[str] = []

    # Carry over pre-computed fit score to skip auto_score_fit redundancy.
    # auto_score_fit checks app.get("ai_analysis") and skips if present.
    match_score = doc.get("match_score")
    match_reason = doc.get("match_reason")
    if match_score is not None and match_reason:
        now = datetime.now(timezone.utc)
        ai_analysis = {
            "fit_score": match_score,
            "matched_skills": [],
            "missing_skills": [],
            "summary": match_reason,
            "match_reason": match_reason,
            "scored_at": now,
        }
        try:
            await get_collection("applications").update_one(
                {
                    "_id": ObjectId(app_id),
                    "user_id": ObjectId(user_id),
                    "ai_analysis": {"$exists": False},
                },
                {
                    "$set": {
                        "ai_analysis": ai_analysis,
                        "fit_score_status": "complete",
                        "fit_score_computed_at": now,
                    }
                },
            )
        except Exception as exc:
            logger.exception(
                "ai_analysis_carry_over_failed",
                application_id=app_id,
                error=str(exc),
            )
            warnings.append("ai_analysis_carry_over_failed")

    cover = doc.get("cover_letter") or {}
    talking_points = doc.get("talking_points") or []
    apply_pack = {
        "cover_letter": cover.get("body") or "",
        "short_answers": [],
        "linkedin_note": "",
        "talking_points": talking_points,
    }
    try:
        app_collection = get_collection("applications")
        app_obj_id = ObjectId(app_id)
        user_obj_id = ObjectId(user_id)

        # Atomic idempotent update: only set if apply_pack doesn't already exist
        result = await app_collection.update_one(
            {
                "_id": app_obj_id,
                "user_id": user_obj_id,
                "apply_pack": {"$exists": False},
            },
            {"$set": {
                "cover_letter_draft": cover,
                "apply_pack": apply_pack,
            }},
        )
        if result.matched_count == 0:
            logger.info("apply_pack_already_attached", application_id=app_id)
    except Exception as exc:
        logger.exception(
            "apply_pack_attach_failed",
            application_id=app_id,
            error=str(exc),
        )
        now = datetime.now(timezone.utc)
        await get_collection("applications").update_one(
            {"_id": ObjectId(app_id), "user_id": ObjectId(user_id)},
            {"$set": {
                "apply_pack_attach_error": True,
                "apply_pack_attach_error_at": now,
            }},
        )
        warnings.append("apply_pack_attach_failed")

    now = datetime.now(timezone.utc)
    await get_collection("pending_opportunities").update_one(
        {"_id": doc["_id"], "user_id": ObjectId(user_id)},
        {"$set": {"status": APPROVED_STATUS, "reviewed_at": now}},
    )
    logger.info(
        "autopilot_opportunity_approved",
        user_id=user_id,
        opportunity_id=opportunity_id,
        application_id=app_id,
        warnings=warnings if warnings else None,
    )
    return opportunity_id, app_id, warnings


async def dismiss_pending_opportunity(user_id: str, opportunity_id: str) -> None:
    doc = await _get_pending_doc(user_id, opportunity_id)
    if doc["status"] != PENDING_STATUS:
        raise PendingOpportunityInvalidStateError

    now = datetime.now(timezone.utc)
    await get_collection("pending_opportunities").update_one(
        {"_id": doc["_id"], "user_id": ObjectId(user_id)},
        {"$set": {"status": DISMISSED_STATUS, "reviewed_at": now}},
    )
    logger.info("autopilot_opportunity_dismissed", user_id=user_id, opportunity_id=opportunity_id)


class RecruiterLeadNotFoundError(Exception):
    """Raised when a recruiter lead is not found for this user."""


class RecruiterLeadInvalidStateError(Exception):
    """Raised when action on a recruiter lead is not permitted."""


async def list_pending_recruiter_leads(user_id: str) -> list[RecruiterLeadResponse]:
    """Return pending recruiter leads for the user."""
    docs = await list_recruiter_leads(user_id)
    return [RecruiterLeadResponse.from_doc(doc) for doc in docs]


async def add_recruiter_lead_to_watchlist(user_id: str, lead_id: str) -> tuple[str, str]:
    """Mark lead added_to_watchlist and append company to user watchlist_companies."""
    lead = await get_recruiter_lead(user_id, lead_id)
    if lead is None:
        raise RecruiterLeadNotFoundError

    if lead["status"] != PENDING_STATUS:
        raise RecruiterLeadInvalidStateError

    success = await set_lead_status(user_id, lead_id, ADDED_TO_WATCHLIST_STATUS)
    if not success:
        raise RecruiterLeadInvalidStateError

    company: str = lead["company"]
    await _upsert_watchlist_company(user_id, company)
    logger.info("recruiter_lead_added_to_watchlist", user_id=user_id, lead_id=lead_id, company=company)
    return lead_id, company


async def _upsert_watchlist_company(user_id: str, company: str) -> None:
    """Add company to user watchlist_companies if not already present (case-insensitive)."""
    users = get_collection("users")
    user = await users.find_one({"_id": ObjectId(user_id)}, {"watchlist_companies": 1})
    if not user:
        return

    companies: list[dict] = user.get("watchlist_companies") or []
    existing_names = {c["name"].lower() for c in companies if isinstance(c, dict) and "name" in c}
    if company.lower() not in existing_names:
        companies.append({"name": company, "careers_url": ""})
        await users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"watchlist_companies": companies}},
        )


async def dismiss_recruiter_lead(user_id: str, lead_id: str) -> None:
    """Dismiss a recruiter lead."""
    lead = await get_recruiter_lead(user_id, lead_id)
    if lead is None:
        raise RecruiterLeadNotFoundError

    if lead["status"] != PENDING_STATUS:
        raise RecruiterLeadInvalidStateError

    success = await set_lead_status(user_id, lead_id, DISMISSED_STATUS)
    if not success:
        raise RecruiterLeadInvalidStateError

    logger.info("recruiter_lead_dismissed", user_id=user_id, lead_id=lead_id)
