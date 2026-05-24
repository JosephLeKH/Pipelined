"""Tests for weekly review aggregator and ghost detection."""

import datetime as dt

import pytest
import pytest_asyncio
from bson import ObjectId

from database import get_collection
from review.ghost_detection import (
    compute_ghost_rate,
    compute_median_response_days,
    find_ghost_apps,
    ghost_mission_reason,
)
from review.weekly_review import build_weekly_review


def _app(
    *,
    app_id: ObjectId,
    user_id: ObjectId,
    stage: str = "Applied",
    history_len: int = 1,
    days_ago: int = 20,
    updated_days_ago: int = 20,
) -> dict:
    now = dt.datetime.now(dt.timezone.utc)
    applied = now - dt.timedelta(days=days_ago)
    updated = now - dt.timedelta(days=updated_days_ago)
    history = [{"stage": "Applied", "transitioned_at": applied}]
    if history_len >= 2:
        history.append({
            "stage": "Phone Screen",
            "transitioned_at": applied + dt.timedelta(days=5),
        })
    return {
        "_id": app_id,
        "user_id": user_id,
        "company": "Acme",
        "role_title": "Engineer",
        "current_stage": stage,
        "stage_history": history,
        "date_applied": applied,
        "created_at": applied,
        "updated_at": updated,
    }


def test_compute_median_response_days():
    apps = [
        {"stage_history": [
            {"transitioned_at": dt.datetime(2026, 1, 1, tzinfo=dt.timezone.utc)},
            {"transitioned_at": dt.datetime(2026, 1, 8, tzinfo=dt.timezone.utc)},
        ]},
        {"stage_history": [
            {"transitioned_at": dt.datetime(2026, 1, 1, tzinfo=dt.timezone.utc)},
            {"transitioned_at": dt.datetime(2026, 1, 15, tzinfo=dt.timezone.utc)},
        ]},
    ]

    assert compute_median_response_days(apps) == 10


def test_find_ghost_apps_exceeds_median():
    now = dt.datetime(2026, 5, 24, tzinfo=dt.timezone.utc)
    responded = _app(
        app_id=ObjectId(),
        user_id=ObjectId(),
        history_len=2,
        days_ago=30,
    )
    ghost = _app(
        app_id=ObjectId(),
        user_id=ObjectId(),
        days_ago=21,
    )

    ghosts = find_ghost_apps([responded, ghost], now=now)

    assert len(ghosts) == 1
    assert ghosts[0].days_waiting >= 20


def test_ghost_mission_reason_includes_median():
    reason = ghost_mission_reason(14, 7)

    assert "14 days" in reason
    assert "median response: 7 days" in reason


def test_compute_ghost_rate():
    uid = ObjectId()
    responded = _app(app_id=ObjectId(), user_id=uid, history_len=2, days_ago=30)
    ghost = _app(app_id=ObjectId(), user_id=uid, days_ago=21)

    rate = compute_ghost_rate([responded, ghost])

    assert rate == 1.0


@pytest_asyncio.fixture(loop_scope="session")
async def review_user(client):
    resp = await client.post("/api/auth/register", json={
        "email": "weekly_review@example.com",
        "password": "password123",
        "display_name": "Weekly Review User",
    })
    assert resp.status_code == 201
    uid = ObjectId(resp.json()["data"]["id"])
    from tests.conftest import verify_user_by_id
    await verify_user_by_id(str(uid))
    return uid


@pytest.mark.asyncio(loop_scope="session")
async def test_build_weekly_review_aggregates_metrics(review_user):
    apps_col = get_collection("applications")
    now = dt.datetime.now(dt.timezone.utc)
    uid = review_user

    await apps_col.insert_many([
        {
            "user_id": uid,
            "company": "Alpha",
            "role_title": "SWE",
            "current_stage": "Applied",
            "stage_history": [{"stage": "Applied", "transitioned_at": now - dt.timedelta(days=20)}],
            "date_applied": now - dt.timedelta(days=20),
            "updated_at": now - dt.timedelta(days=20),
            "created_at": now - dt.timedelta(days=20),
        },
        {
            "user_id": uid,
            "company": "Beta",
            "role_title": "PM",
            "current_stage": "Phone Screen",
            "stage_history": [
                {"stage": "Applied", "transitioned_at": now - dt.timedelta(days=30)},
                {"stage": "Phone Screen", "transitioned_at": now - dt.timedelta(days=25)},
            ],
            "date_applied": now - dt.timedelta(days=30),
            "updated_at": now - dt.timedelta(days=1),
            "created_at": now - dt.timedelta(days=30),
        },
    ])

    review = await build_weekly_review(str(uid))

    assert review.response_rate == 0.5
    assert review.ghost_rate >= 0.0
    assert review.velocity.weekly_goal >= 1
    assert isinstance(review.stale_applications, list)
