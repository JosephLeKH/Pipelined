"""Integration tests for Gmail activity feed endpoint."""

from datetime import datetime, timezone

import pytest
from bson import ObjectId

import database


@pytest.mark.asyncio(loop_scope="session")
async def test_gmail_activity_requires_auth(client):
    resp = await client.get("/api/email/activity")

    assert resp.status_code == 401


@pytest.mark.asyncio(loop_scope="session")
async def test_gmail_activity_returns_empty_when_not_connected(client, test_user):
    _, cookies = test_user

    resp = await client.get("/api/email/activity", cookies=cookies)

    assert resp.status_code == 200
    assert resp.json()["events"] == []


@pytest.mark.asyncio(loop_scope="session")
async def test_gmail_activity_returns_recent_events(client, test_user):
    user, cookies = test_user
    user_id = ObjectId(user["id"])
    await database.get_collection("users").update_one(
        {"_id": user_id},
        {"$set": {"gmail_access_token": "tok", "gmail_email": "jobs@example.com"}},
    )

    col = database.get_collection("gmail_activity")
    now = datetime.now(timezone.utc)
    await col.insert_many([
        {
            "user_id": user_id,
            "event_type": "application_tracked",
            "timestamp": now,
            "application_id": "app1",
            "company": "Acme",
            "role_title": "Engineer",
        },
        {
            "user_id": user_id,
            "event_type": "status_updated",
            "timestamp": now,
            "application_id": "app2",
            "company": "Beta",
            "role_title": "PM",
        },
        {
            "user_id": ObjectId(),
            "event_type": "application_tracked",
            "timestamp": now,
            "application_id": "other",
            "company": "OtherCo",
            "role_title": "Role",
        },
    ])

    resp = await client.get("/api/email/activity", cookies=cookies)

    assert resp.status_code == 200
    events = resp.json()["events"]
    assert len(events) == 2
    assert all("subject" not in e and "body" not in e for e in events)
    assert events[0]["event_type"] in {"application_tracked", "status_updated"}
    assert events[0]["company"] in {"Acme", "Beta"}


@pytest.mark.asyncio(loop_scope="session")
async def test_gmail_activity_limits_to_five_events(client, test_user):
    user, cookies = test_user
    user_id = ObjectId(user["id"])
    await database.get_collection("users").update_one(
        {"_id": user_id},
        {"$set": {"gmail_access_token": "tok"}},
    )

    col = database.get_collection("gmail_activity")
    now = datetime.now(timezone.utc)
    docs = [
        {
            "user_id": user_id,
            "event_type": "application_tracked",
            "timestamp": datetime(now.year, now.month, now.day, h, 0, tzinfo=timezone.utc),
            "application_id": f"app{h}",
            "company": f"Co{h}",
            "role_title": "Role",
        }
        for h in range(7)
    ]
    await col.insert_many(docs)

    resp = await client.get("/api/email/activity", cookies=cookies)

    assert resp.status_code == 200
    assert len(resp.json()["events"]) == 5
