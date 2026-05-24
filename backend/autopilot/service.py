"""Autopilot business logic for pending opportunities."""

from datetime import datetime, timezone

import structlog
from applications.schemas import ApplicationCreate
from applications.service import DuplicateApplicationError, create as create_application
from autopilot.constants import (
    APPROVED_STATUS,
    AUTOPILOT_APPLICATION_STAGE,
    DISMISSED_STATUS,
    PENDING_STATUS,
)
from autopilot.schemas import PendingOpportunityResponse
from bson import ObjectId
from bson.errors import InvalidId
from database import get_collection

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


async def approve_pending_opportunity(user_id: str, opportunity_id: str) -> tuple[str, str]:
    """Approve a pending opportunity and create a To Apply application."""
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
        source="autopilot",
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

    cover = doc.get("cover_letter") or {}
    talking_points = doc.get("talking_points") or []
    apply_pack = {
        "cover_letter": cover.get("body") or "",
        "short_answers": [],
        "linkedin_note": "",
        "talking_points": talking_points,
    }
    await get_collection("applications").update_one(
        {"_id": ObjectId(app_id), "user_id": ObjectId(user_id)},
        {"$set": {
            "cover_letter_draft": cover,
            "apply_pack": apply_pack,
        }},
    )

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
    )
    return opportunity_id, app_id


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
