"""Ghost application detection using median response time comparison."""

import datetime as dt
from dataclasses import dataclass

from applications.service_constants import INITIAL_STAGE, INACTIVE_STAGES, STALE_DAYS

GHOST_MIN_DAYS = 7
MEDIAN_FALLBACK_DAYS = 14


@dataclass(frozen=True)
class GhostApp:
    app_id: str
    company: str
    role_title: str
    days_waiting: int


def _days_since_applied(doc: dict, now: dt.datetime) -> int:
    applied = doc.get("date_applied") or doc.get("created_at")
    if applied is None:
        return 0
    if isinstance(applied, dt.datetime):
        if applied.tzinfo is None:
            applied = applied.replace(tzinfo=dt.timezone.utc)
        delta = now - applied
    else:
        try:
            applied_date = dt.date.fromisoformat(str(applied)[:10])
            delta = now.date() - applied_date
        except ValueError:
            return 0
        return max(0, delta.days)
    return max(0, delta.days)


def _first_response_days(doc: dict) -> int | None:
    history = doc.get("stage_history") or []
    if len(history) < 2:
        return None
    first = history[0].get("transitioned_at")
    second = history[1].get("transitioned_at")
    if not isinstance(first, dt.datetime) or not isinstance(second, dt.datetime):
        return None
    if first.tzinfo is None:
        first = first.replace(tzinfo=dt.timezone.utc)
    if second.tzinfo is None:
        second = second.replace(tzinfo=dt.timezone.utc)
    return max(0, (second - first).days)


def compute_median_response_days(apps: list[dict]) -> int:
    """Return median days-to-first-response across apps that received a response."""
    days_list = sorted(d for doc in apps if (d := _first_response_days(doc)) is not None)
    if not days_list:
        return MEDIAN_FALLBACK_DAYS
    mid = len(days_list) // 2
    if len(days_list) % 2 == 1:
        return days_list[mid]
    return round((days_list[mid - 1] + days_list[mid]) / 2)


def _is_unresponsive(doc: dict) -> bool:
    history = doc.get("stage_history") or []
    if len(history) > 1:
        return False
    stage = doc.get("current_stage", INITIAL_STAGE)
    return stage == INITIAL_STAGE or len(history) <= 1


def find_ghost_apps(apps: list[dict], *, now: dt.datetime | None = None) -> list[GhostApp]:
    """Return active unresponsive applications exceeding the median wait threshold."""
    moment = now or dt.datetime.now(dt.timezone.utc)
    median_days = compute_median_response_days(apps)
    threshold = max(GHOST_MIN_DAYS, median_days)
    ghosts: list[GhostApp] = []

    for doc in apps:
        if doc.get("archived") or doc.get("deleted"):
            continue
        if doc.get("current_stage") in INACTIVE_STAGES:
            continue
        if not _is_unresponsive(doc):
            continue
        days_waiting = _days_since_applied(doc, moment)
        if days_waiting < threshold:
            continue
        ghosts.append(GhostApp(
            app_id=str(doc["_id"]),
            company=doc.get("company") or "Unknown",
            role_title=doc.get("role_title") or "Unknown Role",
            days_waiting=days_waiting,
        ))

    ghosts.sort(key=lambda g: g.days_waiting, reverse=True)
    return ghosts


def ghost_mission_reason(days_waiting: int, median_days: int) -> str:
    """Build a mission reason comparing wait time to the user's median response."""
    return (
        f"Likely ghosted — {days_waiting} days waiting "
        f"(your median response: {median_days} days)"
    )


def compute_ghost_rate(apps: list[dict], *, now: dt.datetime | None = None) -> float:
    """Return fraction of active applications that appear ghosted."""
    active = [
        doc for doc in apps
        if not doc.get("archived") and not doc.get("deleted")
        and doc.get("current_stage") not in INACTIVE_STAGES
    ]
    if not active:
        return 0.0
    ghost_ids = {g.app_id for g in find_ghost_apps(apps, now=now)}
    unresponsive = [doc for doc in active if _is_unresponsive(doc)]
    if not unresponsive:
        return 0.0
    ghost_count = sum(1 for doc in unresponsive if str(doc["_id"]) in ghost_ids)
    return round(ghost_count / len(unresponsive), 2)


def stale_cutoff(now: dt.datetime | None = None) -> dt.datetime:
    """Return the updated_at cutoff for stale application detection."""
    moment = now or dt.datetime.now(dt.timezone.utc)
    return moment - dt.timedelta(days=STALE_DAYS)
