"""Nightly autopilot scan — find high-fit jobs and queue pending opportunities."""

from datetime import datetime, timezone

import structlog
from ai.agent_log import AGENT_TYPE_AUTOPILOT, STATUS_SUCCESS, log_agent_run
from auth.constants import DEFAULT_AUTOPILOT_MAX_DAILY, DEFAULT_AUTOPILOT_MIN_MATCH_SCORE
from autopilot.constants import PENDING_STATUS
from autopilot.match_scorer import score_listing_for_user
from autopilot.prep_generator import generate_opportunity_prep
from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from database import get_collection
from jobs.service import get_recommended_listings

logger = structlog.get_logger()


def _utc_day_start() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


async def _get_today_created_count(user_id: ObjectId) -> int:
    return await get_collection("pending_opportunities").count_documents({
        "user_id": user_id,
        "created_at": {"$gte": _utc_day_start()},
    })


async def _get_excluded_listing_ids(uid: ObjectId) -> set[ObjectId]:
    pending_col = get_collection("pending_opportunities")
    pending_docs = await pending_col.find(
        {"user_id": uid}, projection={"job_listing_id": 1}
    ).to_list(length=500)
    return {doc["job_listing_id"] for doc in pending_docs if doc.get("job_listing_id")}


async def _is_already_applied(listing: dict, app_docs: list[dict]) -> bool:
    apply_url = (listing.get("apply_url") or "").lower().strip()
    company = (listing.get("company") or "").lower()
    role = (listing.get("role") or "").lower()
    for app in app_docs:
        if apply_url and (app.get("source_url") or "").lower().strip() == apply_url:
            return True
        if app.get("normalised_company") == company and app.get("normalised_role") == role:
            return True
    return False


async def _scan_for_user(user_doc: dict) -> int:
    user_id = str(user_doc["_id"])
    uid = user_doc["_id"]
    min_score = user_doc.get("autopilot_min_match_score", DEFAULT_AUTOPILOT_MIN_MATCH_SCORE)
    max_daily = user_doc.get("autopilot_max_daily", DEFAULT_AUTOPILOT_MAX_DAILY)

    if not user_doc.get("resume_text"):
        return 0

    created_today = await _get_today_created_count(uid)
    remaining = max(0, max_daily - created_today)
    if remaining == 0:
        return 0

    listings = await get_recommended_listings(user_id)
    apps_col = get_collection("applications")
    app_docs = await apps_col.find(
        {"user_id": uid, "deleted": {"$ne": True}},
        projection={"source_url": 1, "normalised_company": 1, "normalised_role": 1},
    ).to_list(length=500)
    excluded_ids = await _get_excluded_listing_ids(uid)
    pending_col = get_collection("pending_opportunities")
    matches_created = 0

    for listing in listings:
        if matches_created >= remaining:
            break
        listing_id = listing.get("_id")
        if listing_id is None or listing_id in excluded_ids:
            continue
        if await _is_already_applied(listing, app_docs):
            continue

        score_result = await score_listing_for_user(user_id, user_doc, listing)
        if score_result is None:
            continue
        if score_result["score"] < min_score:
            continue

        prep = await generate_opportunity_prep(
            user_id, user_doc, listing, score_result["reason"]
        )
        if prep is None:
            continue

        now = datetime.now(timezone.utc)
        doc = {
            "user_id": uid,
            "job_listing_id": listing_id,
            "match_score": score_result["score"],
            "match_reason": score_result["reason"],
            "cover_letter": prep["cover_letter"],
            "resume_tips": prep["resume_tips"],
            "talking_points": prep.get("talking_points") or [],
            "status": PENDING_STATUS,
            "created_at": now,
            "reviewed_at": None,
        }
        try:
            await pending_col.insert_one(doc)
        except DuplicateKeyError:
            continue
        except Exception as exc:
            logger.warning(
                "pending_opportunity_insert_failed",
                user_id=user_id,
                job_listing_id=str(listing_id),
                error=str(exc),
            )
            continue
        excluded_ids.add(listing_id)
        matches_created += 1
        company = listing.get("company") or "Unknown"
        role = listing.get("role") or "Role"
        await log_agent_run(
            user_id,
            AGENT_TYPE_AUTOPILOT,
            STATUS_SUCCESS,
            f"Matched {company} — {role} ({score_result['score']}%)",
        )

    if matches_created:
        logger.info("autopilot_scan_user_complete", user_id=user_id, matches_created=matches_created)
    return matches_created


async def autopilot_scan() -> None:
    """Scheduled job: scan autopilot-enabled users for high-fit listings."""
    logger.info("autopilot_scan_started")
    users_col = get_collection("users")
    cursor = users_col.find({"autopilot_enabled": True})
    total_matches = 0
    async for user_doc in cursor:
        total_matches += await _scan_for_user(user_doc)
    logger.info("autopilot_scan_completed", total_matches=total_matches)
