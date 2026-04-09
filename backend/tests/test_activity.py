"""Integration tests for the activity feed endpoint."""

import datetime as dt

import pytest
from bson import ObjectId

from database import get_collection

pytestmark = pytest.mark.asyncio(loop_scope="session")

_NOW = dt.datetime.now(dt.timezone.utc)


async def _get_user_id(client, cookies) -> ObjectId:
    resp = await client.get("/api/auth/me", cookies=cookies)
    return ObjectId(resp.json()["data"]["id"])


# ---------------------------------------------------------------------------
# GET /api/activity
# ---------------------------------------------------------------------------


async def test_activity_requires_auth(client):
    # Act
    resp = await client.get("/api/activity")

    # Assert
    assert resp.status_code == 401


async def test_activity_returns_empty_for_new_user(client, test_user):
    # Arrange
    _, cookies = test_user

    # Act
    resp = await client.get("/api/activity", cookies=cookies)

    # Assert
    assert resp.status_code == 200
    body = resp.json()
    assert body["data"] == []
    assert body["meta"]["total"] == 0


async def test_activity_returns_applied_events(client, test_user):
    # Arrange
    _, cookies = test_user
    user_id = await _get_user_id(client, cookies)

    col = get_collection("applications")
    await col.insert_one({
        "user_id": user_id,
        "company": "Acme",
        "role_title": "Engineer",
        "date_applied": _NOW - dt.timedelta(days=1),
        "stage": "Applied",
        "stage_history": [{"stage": "Applied", "transitioned_at": _NOW - dt.timedelta(days=1)}],
        "archived": False,
    })

    # Act
    resp = await client.get("/api/activity?days=30", cookies=cookies)

    # Assert
    assert resp.status_code == 200
    data = resp.json()["data"]
    applied = [e for e in data if e["type"] == "applied"]
    assert len(applied) >= 1
    assert applied[0]["company"] == "Acme"
    assert applied[0]["role_title"] == "Engineer"


async def test_activity_returns_stage_change_events(client, test_user):
    # Arrange
    _, cookies = test_user
    user_id = await _get_user_id(client, cookies)

    col = get_collection("applications")
    await col.insert_one({
        "user_id": user_id,
        "company": "Beta",
        "role_title": "PM",
        "date_applied": _NOW - dt.timedelta(days=5),
        "stage": "Interview",
        "stage_history": [
            {"stage": "Applied", "transitioned_at": _NOW - dt.timedelta(days=5)},
            {"stage": "Interview", "transitioned_at": _NOW - dt.timedelta(days=2)},
        ],
        "archived": False,
    })

    # Act
    resp = await client.get("/api/activity?days=30", cookies=cookies)

    # Assert
    data = resp.json()["data"]
    stage_events = [e for e in data if e["type"] == "stage_change" and e["company"] == "Beta"]
    assert len(stage_events) >= 1
    assert stage_events[0]["details"]["from_stage"] == "Applied"
    assert stage_events[0]["details"]["to_stage"] == "Interview"


async def test_activity_returns_event_created_events(client, test_user):
    # Arrange
    _, cookies = test_user
    user_id = await _get_user_id(client, cookies)

    app_id = ObjectId()
    cal_col = get_collection("calendar_events")
    await cal_col.insert_one({
        "user_id": user_id,
        "application_id": app_id,
        "company": "Gamma",
        "role_title": "SWE",
        "event_type": "phone_screen",
        "title": "Phone screen at Gamma",
        "created_at": _NOW - dt.timedelta(days=1),
        "start_time": _NOW + dt.timedelta(days=1),
        "end_time": _NOW + dt.timedelta(days=1, hours=1),
    })

    # Act
    resp = await client.get("/api/activity?days=30", cookies=cookies)

    # Assert
    data = resp.json()["data"]
    cal_events = [e for e in data if e["type"] == "event_created" and e["company"] == "Gamma"]
    assert len(cal_events) >= 1
    assert cal_events[0]["details"]["event_type"] == "phone_screen"


async def test_activity_sorted_chronologically(client, test_user):
    # Arrange
    _, cookies = test_user
    user_id = await _get_user_id(client, cookies)

    col = get_collection("applications")
    await col.insert_many([
        {
            "user_id": user_id,
            "company": "Early",
            "role_title": "A",
            "date_applied": _NOW - dt.timedelta(days=10),
            "stage": "Applied",
            "stage_history": [{"stage": "Applied", "transitioned_at": _NOW - dt.timedelta(days=10)}],
            "archived": False,
        },
        {
            "user_id": user_id,
            "company": "Recent",
            "role_title": "B",
            "date_applied": _NOW - dt.timedelta(days=1),
            "stage": "Applied",
            "stage_history": [{"stage": "Applied", "transitioned_at": _NOW - dt.timedelta(days=1)}],
            "archived": False,
        },
    ])

    # Act
    resp = await client.get("/api/activity?days=30", cookies=cookies)

    # Assert
    data = resp.json()["data"]
    applied = [e for e in data if e["type"] == "applied" and e["company"] in ("Early", "Recent")]
    companies = [e["company"] for e in applied]
    # Recent should come before Early (sorted desc)
    assert companies.index("Recent") < companies.index("Early")


async def test_activity_excludes_beyond_days_range(client, test_user):
    # Arrange
    _, cookies = test_user
    user_id = await _get_user_id(client, cookies)

    col = get_collection("applications")
    await col.insert_one({
        "user_id": user_id,
        "company": "OldCorp",
        "role_title": "Old Role",
        "date_applied": _NOW - dt.timedelta(days=60),
        "stage": "Applied",
        "stage_history": [{"stage": "Applied", "transitioned_at": _NOW - dt.timedelta(days=60)}],
        "archived": False,
    })

    # Act — request only last 30 days
    resp = await client.get("/api/activity?days=30", cookies=cookies)

    # Assert
    data = resp.json()["data"]
    old = [e for e in data if e.get("company") == "OldCorp"]
    assert old == []
