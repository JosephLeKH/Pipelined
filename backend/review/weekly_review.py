"""Weekly pipeline review aggregator: response rate, ghost rate, velocity, stale list."""

import asyncio
import datetime as dt
from dataclasses import asdict, dataclass, field
from zoneinfo import ZoneInfo

from bson import ObjectId

from applications.service_analytics_helpers import _compute_weekly_stats, _extract_date_str
from applications.service_constants import INACTIVE_STAGES, STALE_DAYS
from auth.constants import DEFAULT_TIMEZONE
from auth.schemas import DEFAULT_WEEKLY_GOAL
from database import get_collection
from review.ghost_detection import compute_ghost_rate, stale_cutoff


@dataclass
class StaleAppItem:
    id: str
    company: str
    role_title: str
    days_since_update: int


@dataclass
class VelocityMetrics:
    applied_this_week: int
    weekly_goal: int
    percent_of_goal: float


@dataclass
class WeeklyReview:
    user_id: str
    week_start: str
    response_rate: float
    ghost_rate: float
    velocity: VelocityMetrics
    stale_applications: list[StaleAppItem] = field(default_factory=list)


def _week_start_for_user(user_doc: dict, when: dt.datetime | None = None) -> str:
    """Return ISO date of the Monday starting the current ISO week in the user's timezone."""
    tz = ZoneInfo(user_doc.get("timezone", DEFAULT_TIMEZONE))
    moment = (when or dt.datetime.now(dt.timezone.utc)).astimezone(tz)
    monday = moment.date() - dt.timedelta(days=moment.weekday())
    return monday.isoformat()


def _compute_response_rate(apps: list[dict]) -> float:
    """Return fraction of non-deleted apps that received at least one stage transition."""
    eligible = [doc for doc in apps if not doc.get("deleted")]
    if not eligible:
        return 0.0
    with_response = sum(
        1 for doc in eligible
        if len(doc.get("stage_history") or []) > 1
    )
    return round(with_response / len(eligible), 2)


def _build_stale_list(apps: list[dict], now: dt.datetime) -> list[StaleAppItem]:
    """Return active applications not updated within STALE_DAYS."""
    cutoff = stale_cutoff(now)
    items: list[StaleAppItem] = []
    for doc in apps:
        if doc.get("archived") or doc.get("deleted"):
            continue
        if doc.get("current_stage") in INACTIVE_STAGES:
            continue
        updated = doc.get("updated_at")
        if not isinstance(updated, dt.datetime):
            continue
        if updated.tzinfo is None:
            updated = updated.replace(tzinfo=dt.timezone.utc)
        if updated >= cutoff:
            continue
        days = max(0, (now - updated).days)
        items.append(StaleAppItem(
            id=str(doc["_id"]),
            company=doc.get("company") or "Unknown",
            role_title=doc.get("role_title") or "Unknown Role",
            days_since_update=days,
        ))
    items.sort(key=lambda item: item.days_since_update, reverse=True)
    return items


def _build_velocity(apps: list[dict], weekly_goal: int) -> VelocityMetrics:
    """Return application velocity for the current ISO week."""
    dates = [_extract_date_str(doc.get("date_applied")) for doc in apps if not doc.get("deleted")]
    applied_this_week, _ = _compute_weekly_stats(dates, weekly_goal)
    percent = round(applied_this_week / weekly_goal, 2) if weekly_goal > 0 else 0.0
    return VelocityMetrics(
        applied_this_week=applied_this_week,
        weekly_goal=weekly_goal,
        percent_of_goal=min(percent, 1.0),
    )


async def build_weekly_review(user_id: str, week_start: str | None = None) -> WeeklyReview:
    """Aggregate weekly review metrics for a user."""
    uid = ObjectId(user_id)
    users_col = get_collection("users")
    apps_col = get_collection("applications")
    now = dt.datetime.now(dt.timezone.utc)

    user, app_docs = await asyncio.gather(
        users_col.find_one({"_id": uid}),
        apps_col.find(
            {"user_id": uid},
            {
                "_id": 1,
                "company": 1,
                "role_title": 1,
                "current_stage": 1,
                "stage_history": 1,
                "date_applied": 1,
                "created_at": 1,
                "updated_at": 1,
                "archived": 1,
                "deleted": 1,
            },
        ).to_list(length=None),
    )
    if not user:
        raise ValueError(f"User not found: {user_id}")

    resolved_week = week_start or _week_start_for_user(user, now)
    weekly_goal = user.get("weekly_goal", DEFAULT_WEEKLY_GOAL)

    return WeeklyReview(
        user_id=user_id,
        week_start=resolved_week,
        response_rate=_compute_response_rate(app_docs),
        ghost_rate=compute_ghost_rate(app_docs, now=now),
        velocity=_build_velocity(app_docs, weekly_goal),
        stale_applications=_build_stale_list(app_docs, now),
    )


def weekly_review_to_dict(review: WeeklyReview) -> dict:
    """Serialize a WeeklyReview for MongoDB storage and API responses."""
    payload = asdict(review)
    payload["velocity"] = asdict(review.velocity)
    payload["stale_applications"] = [asdict(item) for item in review.stale_applications]
    return payload
