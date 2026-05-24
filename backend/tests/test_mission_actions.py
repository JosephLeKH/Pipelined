"""Tests for mission snooze and done endpoints."""

import datetime as dt

import pytest
import pytest_asyncio
from bson import ObjectId

import database
from tests.conftest import verify_user_by_id

REGISTER_PAYLOAD = {
    "email": "mission_actions@example.com",
    "password": "password123",
    "display_name": "Mission Actions User",
}


@pytest_asyncio.fixture(loop_scope="session")
async def mission_user(client):
    resp = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    assert resp.status_code == 201
    uid = resp.json()["data"]["id"]
    await verify_user_by_id(uid)
    yesterday = dt.datetime.combine(
        dt.date.today() - dt.timedelta(days=2),
        dt.time.min,
        tzinfo=dt.timezone.utc,
    )
    await database.get_collection("applications").insert_one({
        "user_id": ObjectId(uid),
        "company": "Acme",
        "role_title": "Engineer",
        "archived": False,
        "follow_up_date": yesterday,
        "updated_at": dt.datetime.now(dt.timezone.utc),
        "created_at": dt.datetime.now(dt.timezone.utc),
    })
    cookies = dict(resp.cookies)
    return uid, cookies


@pytest.mark.asyncio(loop_scope="session")
async def test_snooze_mission_excludes_from_today(client, mission_user):
    _, cookies = mission_user

    brief_resp = await client.get("/api/brief/today", cookies=cookies)
    assert brief_resp.status_code == 200
    missions = brief_resp.json()["data"]["missions"]
    assert missions, "Expected at least one mission from follow-up fixture"

    mission_id = missions[0]["id"]
    snooze_resp = await client.post(
        f"/api/brief/missions/{mission_id}/snooze",
        cookies=cookies,
        json={},
    )
    assert snooze_resp.status_code == 200
    assert mission_id in snooze_resp.json()["data"]["snoozed"]

    after_resp = await client.get("/api/brief/today", cookies=cookies)
    active_ids = [m["id"] for m in after_resp.json()["data"]["missions"]]
    assert mission_id not in active_ids


@pytest.mark.asyncio(loop_scope="session")
async def test_done_mission_excludes_from_today(client, mission_user):
    _, cookies = mission_user

    brief_resp = await client.get("/api/brief/today", cookies=cookies)
    assert brief_resp.status_code == 200
    missions = brief_resp.json()["data"]["missions"]
    assert missions, "Expected at least one mission from follow-up fixture"

    mission_id = missions[0]["id"]
    done_resp = await client.post(f"/api/brief/missions/{mission_id}/done", cookies=cookies, json={})
    assert done_resp.status_code == 200
    assert mission_id in done_resp.json()["data"]["completed"]

    after_resp = await client.get("/api/brief/today", cookies=cookies)
    active_ids = [m["id"] for m in after_resp.json()["data"]["missions"]]
    assert mission_id not in active_ids
    progress = after_resp.json()["data"]["mission_progress"]
    assert progress["cleared"] >= 1


@pytest.mark.asyncio(loop_scope="session")
async def test_mission_actions_require_auth(client):
    response = await client.post("/api/brief/missions/follow_ups:0/done")

    assert response.status_code == 401


@pytest.mark.asyncio(loop_scope="session")
async def test_snooze_survives_brief_regeneration(client, mission_user):
    uid, cookies = mission_user
    col = database.get_collection("applications")
    first = await col.find_one({"user_id": ObjectId(uid), "company": "Acme"})
    first_id = str(first["_id"])

    await col.insert_one({
        "user_id": ObjectId(uid),
        "company": "Beta",
        "role_title": "Engineer",
        "archived": False,
        "follow_up_date": dt.datetime.combine(
            dt.date.today() - dt.timedelta(days=3),
            dt.time.min,
            tzinfo=dt.timezone.utc,
        ),
        "updated_at": dt.datetime.now(dt.timezone.utc),
        "created_at": dt.datetime.now(dt.timezone.utc),
    })

    brief_resp = await client.get("/api/brief/today", cookies=cookies)
    assert brief_resp.status_code == 200

    snooze_resp = await client.post(
        f"/api/brief/missions/{first_id}/snooze",
        cookies=cookies,
        json={},
    )
    assert snooze_resp.status_code == 200

    await database.get_collection("morning_briefs").delete_many({"user_id": ObjectId(uid)})
    after_resp = await client.get("/api/brief/today", cookies=cookies)
    active_ids = [m["id"] for m in after_resp.json()["data"]["missions"]]
    assert first_id not in active_ids

    state_resp = await client.post(
        f"/api/brief/missions/{first_id}/snooze",
        cookies=cookies,
        json={},
    )
    assert first_id in state_resp.json()["data"]["snoozed"]
