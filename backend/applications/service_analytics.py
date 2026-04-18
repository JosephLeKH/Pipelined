"""Analytics helpers: stats, funnel metrics, tag rates, and salary distribution."""

import asyncio
from datetime import date, datetime, timedelta, timezone

import structlog
from bson import ObjectId

from applications.service_constants import (
    INACTIVE_STAGES,
    OFFER_STAGE,
    SALARY_BUCKET_LABELS,
    SALARY_BUCKET_THRESHOLDS,
    STALE_DAYS,
    STREAK_LOOKBACK_WEEKS,
)
from auth.service import get_user_by_id
from database import get_collection

logger = structlog.get_logger()


def _current_iso_week_bounds() -> tuple[str, str]:
    """Return (monday_iso, sunday_iso) strings for the current ISO week."""
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    return monday.isoformat(), (monday + timedelta(days=6)).isoformat()


def _compute_weekly_stats(date_applied_list: list[str], weekly_goal: int) -> tuple[int, int]:
    """Return (applied_this_week, current_streak) from ISO date strings."""
    monday_str, sunday_str = _current_iso_week_bounds()
    applied_this_week = sum(1 for d in date_applied_list if monday_str <= d <= sunday_str)
    week_counts: dict[tuple[int, int], int] = {}
    for d_str in date_applied_list:
        try:
            d = date.fromisoformat(d_str)
        except ValueError:
            continue
        iso = d.isocalendar()
        week_counts[(iso.year, iso.week)] = week_counts.get((iso.year, iso.week), 0) + 1
    today = date.today()
    streak = 0
    check = today - timedelta(days=today.weekday() + 7)
    for _ in range(STREAK_LOOKBACK_WEEKS):
        iso = check.isocalendar()
        if week_counts.get((iso.year, iso.week), 0) >= weekly_goal:
            streak += 1
            check -= timedelta(weeks=1)
        else:
            break
    return applied_this_week, streak


def _extract_date_str(value: object) -> str:
    """Return ISO date string from a datetime object or existing string."""
    if isinstance(value, datetime):
        return value.date().isoformat()
    return str(value) if value else ""


def _parse_compensation(text: str) -> int | None:
    """Extract the first numeric salary from a compensation string."""
    import re  # noqa: PLC0415
    m = re.search(r"(\d+(?:\.\d+)?)\s*[kK]", text)
    if m:
        return int(float(m.group(1)) * 1_000)
    m = re.search(r"(\d[\d,]{3,})", text)
    if m:
        return int(m.group(1).replace(",", ""))
    return None


async def _get_salary_distribution(col, base_filter: dict) -> list[dict]:
    """Parse compensation strings and return salary bucket counts."""
    docs = await col.find(
        {**base_filter, "compensation": {"$nin": [None, ""]}},
        {"compensation": 1},
    ).to_list(length=None)
    counts = {label: 0 for label in SALARY_BUCKET_LABELS}
    for doc in docs:
        val = _parse_compensation(doc.get("compensation") or "")
        if val is None:
            continue
        if val < SALARY_BUCKET_THRESHOLDS[0]:
            counts[SALARY_BUCKET_LABELS[0]] += 1
        elif val < SALARY_BUCKET_THRESHOLDS[1]:
            counts[SALARY_BUCKET_LABELS[1]] += 1
        elif val < SALARY_BUCKET_THRESHOLDS[2]:
            counts[SALARY_BUCKET_LABELS[2]] += 1
        elif val < SALARY_BUCKET_THRESHOLDS[3]:
            counts[SALARY_BUCKET_LABELS[3]] += 1
        else:
            counts[SALARY_BUCKET_LABELS[4]] += 1
    return [{"bucket": label, "count": counts[label]} for label in SALARY_BUCKET_LABELS]


async def _compute_tag_offer_rates(user_id: str, col) -> list[dict]:
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


def _compute_stage_metrics(
    stage: str, stage_index: dict[str, int], apps: list[dict], now: datetime
) -> dict:
    """Return funnel metrics dict for a single stage."""
    idx = stage_index[stage]
    entered = 0
    exited = 0
    days_list: list[float] = []
    for app in apps:
        history: list[dict] = app.get("stage_history") or []
        visited = {h["stage"] for h in history}
        if stage not in visited:
            continue
        entered += 1
        if any(stage_index.get(s, -1) > idx for s in visited):
            exited += 1
        for i, entry in enumerate(history):
            if entry["stage"] != stage:
                continue
            entered_at: datetime = entry["transitioned_at"]
            left_at: datetime = history[i + 1]["transitioned_at"] if i + 1 < len(history) else now
            if entered_at.tzinfo is None:
                entered_at = entered_at.replace(tzinfo=timezone.utc)
            if left_at.tzinfo is None:
                left_at = left_at.replace(tzinfo=timezone.utc)
            days = (left_at - entered_at).total_seconds() / 86400
            if days >= 0:
                days_list.append(days)
    avg_days: float | None = round(sum(days_list) / len(days_list), 1) if days_list else None
    return {
        "stage": stage,
        "entered_count": entered,
        "exited_to_next_count": exited,
        "conversion_rate": round(exited / entered, 2) if entered > 0 else 0.0,
        "avg_days_in_stage": avg_days,
        "dropped_count": entered - exited,
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
