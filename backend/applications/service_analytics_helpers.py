"""Pure helper functions for analytics: weekly stats, salary parsing, and funnel metrics."""

from datetime import date, datetime, timedelta, timezone

from motor.motor_asyncio import AsyncIOMotorCollection

from applications.service_constants import (
    SALARY_BUCKET_LABELS,
    SALARY_BUCKET_THRESHOLDS,
    SECONDS_PER_DAY,
    STREAK_LOOKBACK_WEEKS,
)


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


async def _get_salary_distribution(col: AsyncIOMotorCollection, base_filter: dict) -> list[dict]:
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
            days = (left_at - entered_at).total_seconds() / SECONDS_PER_DAY
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
