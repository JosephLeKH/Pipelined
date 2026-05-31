"""Score a job listing against the current user's resume.

Result is cached per (user, listing) in `user_job_scores` so repeated clicks
on the same job do not re-spend the user's daily AI quota.
"""

from datetime import datetime, timezone

import structlog
from bson import ObjectId
from bson.errors import InvalidId

from auth.service import get_user_by_id
from database import get_collection
from jobs import service as jobs_service
from parsing.ai_cache import QuotaExceededError
from parsing.fit_scorer import score_fit

logger = structlog.get_logger()


class ListingNotFoundError(Exception):
    """Raised when the requested listing cannot be located."""


def _build_job_description(listing: dict) -> str:
    parts = [
        listing.get("role"),
        listing.get("company"),
        listing.get("location"),
        listing.get("description"),
    ]
    return "\n".join(p for p in parts if p)


async def _read_cached(user_id: str, listing_id: str) -> dict | None:
    cache = get_collection("user_job_scores")
    doc = await cache.find_one(
        {"user_id": ObjectId(user_id), "listing_id": ObjectId(listing_id)}
    )
    if doc is None:
        return None
    return {
        "score": doc.get("score"),
        "reason": doc.get("reason"),
        "computed_at": doc.get("computed_at"),
        "cached": True,
    }


async def _persist(user_id: str, listing_id: str, score: int, reason: str | None) -> None:
    cache = get_collection("user_job_scores")
    await cache.update_one(
        {"user_id": ObjectId(user_id), "listing_id": ObjectId(listing_id)},
        {
            "$set": {
                "score": score,
                "reason": reason,
                "computed_at": datetime.now(timezone.utc),
            }
        },
        upsert=True,
    )


async def score_listing_for_user(user_id: str, listing_id: str) -> dict:
    """Return (and cache) a fit score for the listing against the user's resume.

    Returns {"score": int | None, "reason": str | None, "cached": bool}.
    Score is None when the user has no resume, the AI provider is unconfigured,
    or the call fails. Raises ListingNotFoundError on bad listing_id, and
    QuotaExceededError when the user has hit their daily AI limit.
    """
    try:
        ObjectId(listing_id)
    except (ValueError, TypeError, InvalidId):
        raise ListingNotFoundError()

    cached = await _read_cached(user_id, listing_id)
    if cached is not None:
        return cached

    listing = await jobs_service.get_listing(listing_id)
    if listing is None:
        raise ListingNotFoundError()

    user = await get_user_by_id(user_id)
    resume_text = (user or {}).get("resume_text") or ""
    if not resume_text:
        return {"score": None, "reason": None, "cached": False}

    job_description = _build_job_description(listing)
    if not job_description:
        return {"score": None, "reason": None, "cached": False}

    result = await score_fit(
        resume_text=resume_text,
        job_description=job_description,
        user_id=user_id,
        role_title=listing.get("role", "") or "",
        company=listing.get("company", "") or "",
    )
    score = result.get("fit_score")
    reason = result.get("summary")
    if score is not None:
        await _persist(user_id, listing_id, score, reason)
        logger.info(
            "listing_fit_score_computed",
            user_id=user_id,
            listing_id=listing_id,
            score=score,
        )
    return {"score": score, "reason": reason, "cached": False}
