"""Analytics orchestration: stats, analytics aggregation, funnel, and tag queries."""

import asyncio
from datetime import datetime, timedelta, timezone

import structlog
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection

from applications.service_analytics_helpers import (
    _compute_stage_metrics,
    _compute_weekly_stats,
    _extract_date_str,
    _get_salary_distribution,
)
from applications.service_constants import (
    INACTIVE_STAGES,
    OFFER_STAGE,
    STALE_DAYS,
)
from auth.service import get_user_by_id
from database import get_collection

logger = structlog.get_logger()


async def _compute_tag_offer_rates(user_id: str, col: AsyncIOMotorCollection) -> list[dict]:
    """Return per-tag offer rates for the current user's applications."""
    uid = ObjectId(user_id)
    pipeline = [
        {"$match": {"user_id": uid, "deleted": {"$ne": True}}},
        {"$unwind": "$tags"},
        {"$group": {
            "_id": "$tags",
            "application_count": {"$sum": 1},
            "offer_count": {"$sum": {"$cond": [{"$eq": ["$current_stage", OFFER_STAGE]}, 1, 0]}},
        }},
        {"$sort": {"application_count": -1, "_id": 1}},
        {"$project": {
            "_id": 0, "tag": "$_id", "application_count": 1, "offer_count": 1,
            "offer_rate": {"$cond": [
                {"$gt": ["$application_count", 0]},
                {"$round": [{"$divide": ["$offer_count", "$application_count"]}, 2]},
                0.0,
            ]},
        }},
    ]
    return await col.aggregate(pipeline).to_list(length=None)


def _build_stats_pipeline(uid: ObjectId, stale_cutoff: datetime, today: datetime) -> list[dict]:
    """Build the $facet aggregation pipeline for compute_stats."""
    return [
        {"$match": {"user_id": uid}},
        {"$facet": {
            "total": [{"$count": "count"}],
            "active": [
                {"$match": {"current_stage": {"$nin": INACTIVE_STAGES}}},
                {"$count": "count"},
            ],
            "with_response": [
                {"$match": {"stage_history.1": {"$exists": True}}},
                {"$count": "count"},
            ],
            "avg_response_days": [
                {"$match": {"stage_history.1": {"$exists": True}}},
                {"$project": {"days": {"$dateDiff": {
                    "startDate": {"$arrayElemAt": ["$stage_history.transitioned_at", 0]},
                    "endDate": {"$arrayElemAt": ["$stage_history.transitioned_at", 1]},
                    "unit": "day",
                }}}},
                {"$group": {"_id": None, "avg": {"$avg": "$days"}}},
            ],
            "stale": [
                {"$match": {"current_stage": {"$nin": INACTIVE_STAGES}, "updated_at": {"$lt": stale_cutoff}}},
                {"$count": "count"},
            ],
            "date_applied_list": [
                {"$match": {"deleted": {"$ne": True}}},
                {"$project": {"_id": 0, "date_applied": 1}},
            ],
            "follow_ups_due": [
                {"$match": {"archived": {"$ne": True}, "deleted": {"$ne": True},
                            "follow_up_date": {"$ne": None, "$lte": today}}},
                {"$count": "count"},
            ],
        }},
    ]


async def compute_stats(user_id: str) -> dict:
    """Return StatsResponse fields using a single $facet aggregation plus weekly stats."""
    uid = ObjectId(user_id)
    col = get_collection("applications")
    stale_cutoff = datetime.now(timezone.utc) - timedelta(days=STALE_DAYS)
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    pipeline = _build_stats_pipeline(uid, stale_cutoff, today)
    user_doc, raw, tag_offer_rates = await asyncio.gather(
        get_user_by_id(user_id),
        col.aggregate(pipeline).to_list(length=None),
        _compute_tag_offer_rates(user_id, col),
    )
    raw = raw[0]
    weekly_goal = user_doc.get("weekly_goal", 5) if user_doc else 5
    total = raw["total"][0]["count"] if raw["total"] else 0
    active = raw["active"][0]["count"] if raw["active"] else 0
    with_response = raw["with_response"][0]["count"] if raw["with_response"] else 0
    avg_days = round(raw["avg_response_days"][0]["avg"], 1) if raw["avg_response_days"] else None
    stale = raw["stale"][0]["count"] if raw["stale"] else 0
    dates = [_extract_date_str(d.get("date_applied")) for d in raw["date_applied_list"]]
    applied_this_week, current_streak = _compute_weekly_stats(dates, weekly_goal)
    follow_ups_due = raw["follow_ups_due"][0]["count"] if raw["follow_ups_due"] else 0
    return {
        "total_applied": total,
        "active_count": active,
        "response_rate": round(with_response / total, 2) if total > 0 else 0.0,
        "avg_days_to_first_response": avg_days,
        "stale_count": stale,
        "applied_this_week": applied_this_week,
        "current_streak": current_streak,
        "follow_ups_due": follow_ups_due,
        "tag_offer_rates": tag_offer_rates,
    }


def _build_analytics_pipeline(base_filter: dict) -> list[dict]:
    """Build the $facet aggregation pipeline for get_analytics."""
    return [
        {"$match": base_filter},
        {"$facet": {
            "by_week": [
                {"$group": {"_id": {"$dateToString": {"format": "%G-W%V", "date": "$date_applied"}},
                            "count": {"$sum": 1}}},
                {"$sort": {"_id": 1}},
            ],
            "stage_funnel": [
                {"$group": {"_id": "$current_stage", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
            ],
            "by_month": [
                {"$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m", "date": "$date_applied"}},
                    "total": {"$sum": 1},
                    "responded": {"$sum": {"$cond": [
                        {"$gt": [{"$size": {"$ifNull": ["$stage_history", []]}}, 1]}, 1, 0,
                    ]}},
                }},
                {"$sort": {"_id": 1}},
            ],
            "top_companies": [
                {"$match": {"company": {"$ne": None}}},
                {"$group": {"_id": "$company", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 10},
            ],
        }},
    ]


async def get_analytics(user_id: str, days: int | None = None) -> dict:
    """Return aggregated analytics data for the user's applications."""
    col = get_collection("applications")
    uid = ObjectId(user_id)
    base_filter: dict = {"user_id": uid, "archived": {"$ne": True}}
    if days is not None:
        cutoff = datetime.now(tz=timezone.utc) - timedelta(days=days)
        base_filter["date_applied"] = {"$gte": cutoff}
    pipeline = _build_analytics_pipeline(base_filter)
    raw_result, salary_dist = await asyncio.gather(
        col.aggregate(pipeline).to_list(length=1),
        _get_salary_distribution(col, base_filter),
    )
    raw = raw_result[0]
    return {
        "applications_by_week": [{"week": r["_id"], "count": r["count"]} for r in raw["by_week"]],
        "stage_funnel": [{"stage": r["_id"], "count": r["count"]} for r in raw["stage_funnel"]],
        "response_rate_by_month": [
            {"month": r["_id"], "rate": round(r["responded"] / r["total"], 2) if r["total"] else 0.0}
            for r in raw["by_month"]
        ],
        "top_companies": [{"company": r["_id"], "count": r["count"]} for r in raw["top_companies"]],
        "salary_distribution": salary_dist,
    }


async def get_funnel(user_id: str) -> list[dict]:
    """Return per-stage funnel metrics ordered by the user's default_stages."""
    col = get_collection("applications")
    uid = ObjectId(user_id)
    user_doc, apps = await asyncio.gather(
        get_user_by_id(user_id),
        col.find(
            {"user_id": uid, "archived": {"$ne": True}},
            {"stage_history": 1, "current_stage": 1},
        ).to_list(length=None),
    )
    from auth.constants import DEFAULT_STAGES  # noqa: PLC0415
    stage_order: list[str] = (user_doc or {}).get("default_stages", DEFAULT_STAGES)
    stage_index: dict[str, int] = {s: i for i, s in enumerate(stage_order)}
    now = datetime.now(tz=timezone.utc)
    return [_compute_stage_metrics(stage, stage_index, apps, now) for stage in stage_order]


async def get_user_tags(user_id: str) -> list[dict]:
    """Return all tags used by the user, sorted by application count descending."""
    col = get_collection("applications")
    uid = ObjectId(user_id)
    pipeline = [
        {"$match": {"user_id": uid, "deleted": {"$ne": True}}},
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1, "_id": 1}},
        {"$project": {"_id": 0, "name": "$_id", "count": 1}},
    ]
    return await col.aggregate(pipeline).to_list(length=None)
