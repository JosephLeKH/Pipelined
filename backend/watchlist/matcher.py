"""Score watchlist listings and queue pending opportunities."""

from datetime import datetime, timezone

import structlog
from ai.agent_log import AGENT_TYPE_AUTOPILOT, STATUS_SUCCESS, log_agent_run
from auth.constants import DEFAULT_AUTOPILOT_MIN_MATCH_SCORE
from autopilot.constants import PENDING_STATUS, SOURCE_WATCHLIST
from autopilot.match_scorer import score_listing_for_user
from autopilot.prep_generator import generate_opportunity_prep
from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from database import get_collection

logger = structlog.get_logger()


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


async def queue_watchlist_matches(user_doc: dict, listing_ids: list[ObjectId]) -> int:
    """Score watchlist listings and insert pending opportunities with source=watchlist."""
    if not listing_ids or not user_doc.get("resume_text"):
        return 0

    user_id = str(user_doc["_id"])
    uid = user_doc["_id"]
    min_score = user_doc.get("autopilot_min_match_score", DEFAULT_AUTOPILOT_MIN_MATCH_SCORE)
    listings_col = get_collection("job_listings")
    pending_col = get_collection("pending_opportunities")
    apps_col = get_collection("applications")

    listing_docs = await listings_col.find({"_id": {"$in": listing_ids}}).to_list(length=len(listing_ids))
    app_docs = await apps_col.find(
        {"user_id": uid, "deleted": {"$ne": True}},
        projection={"source_url": 1, "normalised_company": 1, "normalised_role": 1},
    ).to_list(length=500)

    matches_created = 0
    for listing in listing_docs:
        if await _is_already_applied(listing, app_docs):
            continue

        score_result = await score_listing_for_user(user_id, user_doc, listing)
        if score_result is None or score_result["score"] < min_score:
            continue

        prep = await generate_opportunity_prep(
            user_id, user_doc, listing, score_result["reason"]
        )
        if prep is None:
            continue

        now = datetime.now(timezone.utc)
        doc = {
            "user_id": uid,
            "job_listing_id": listing["_id"],
            "match_score": score_result["score"],
            "match_reason": score_result["reason"],
            "cover_letter": prep["cover_letter"],
            "resume_tips": prep["resume_tips"],
            "talking_points": prep.get("talking_points") or [],
            "status": PENDING_STATUS,
            "source": SOURCE_WATCHLIST,
            "created_at": now,
            "reviewed_at": None,
        }
        try:
            await pending_col.insert_one(doc)
        except DuplicateKeyError:
            continue
        except Exception as exc:
            logger.warning(
                "watchlist_pending_insert_failed",
                user_id=user_id,
                job_listing_id=str(listing["_id"]),
                error=str(exc),
            )
            continue

        matches_created += 1
        company = listing.get("company") or "Unknown"
        role = listing.get("role") or "Role"
        await log_agent_run(
            user_id,
            AGENT_TYPE_AUTOPILOT,
            STATUS_SUCCESS,
            f"Watchlist match {company} — {role} ({score_result['score']}%)",
        )

    if matches_created:
        logger.info("watchlist_matches_queued", user_id=user_id, matches_created=matches_created)
    return matches_created
