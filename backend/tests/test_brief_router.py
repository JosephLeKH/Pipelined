"""Tests for GET /api/brief/today and /history."""

import datetime as dt

import pytest
import pytest_asyncio
from bson import ObjectId

import database
from tests.conftest import verify_user_by_id

REGISTER_PAYLOAD = {
    "email": "brief_api@example.com",
    "password": "password123",
    "display_name": "Brief API User",
}


@pytest_asyncio.fixture(loop_scope="session")
async def brief_api_user(client):
    resp = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    assert resp.status_code == 201
    uid = resp.json()["data"]["id"]
    await verify_user_by_id(uid)
    cookies = dict(resp.cookies)
    return uid, cookies


@pytest.mark.asyncio(loop_scope="session")
async def test_get_brief_today_generates_on_demand(client, brief_api_user):
    _, cookies = brief_api_user

    response = await client.get("/api/brief/today", cookies=cookies)

    assert response.status_code == 200
    data = response.json()["data"]
    assert "date" in data
    assert "sections" in data
    assert "summary_line" in data
    assert "missions" in data
    assert isinstance(data["missions"], list)


@pytest.mark.asyncio(loop_scope="session")
async def test_get_brief_history_returns_list(client, brief_api_user):
    _, cookies = brief_api_user
    await client.get("/api/brief/today", cookies=cookies)

    response = await client.get("/api/brief/history?days=7", cookies=cookies)

    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload["data"], list)
    assert payload["meta"]["days"] == 7


@pytest.mark.asyncio(loop_scope="session")
async def test_get_brief_today_requires_auth(client):
    response = await client.get("/api/brief/today")

    assert response.status_code == 401


@pytest.mark.asyncio(loop_scope="session")
async def test_get_brief_today_requires_verified_email(client, monkeypatch):
    from config import settings

    monkeypatch.setattr(settings, "debug", False)
    resp = await client.post("/api/auth/register", json={
        "email": "brief_unverified@example.com",
        "password": "password123",
        "display_name": "Brief Unverified",
    })
    cookies = dict(resp.cookies)

    response = await client.get("/api/brief/today", cookies=cookies)

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "EMAIL_NOT_VERIFIED"


@pytest.mark.asyncio(loop_scope="session")
async def test_get_brief_today_includes_oa_deadline_missions(client, brief_api_user):
    user_id, cookies = brief_api_user

    today = dt.date.today()
    deadline = dt.datetime.combine(
        today + dt.timedelta(days=2), dt.time(23, 59), tzinfo=dt.timezone.utc,
    )
    app_result = await database.get_collection("applications").insert_one({
        "user_id": ObjectId(user_id),
        "company": "DeadlineCo",
        "role_title": "Engineer",
        "current_stage": "OA",
        "archived": False,
        "deleted": False,
        "deadline": deadline,
    })
    app_id = str(app_result.inserted_id)

    response = await client.get("/api/brief/today", cookies=cookies)

    assert response.status_code == 200
    data = response.json()["data"]
    oa_section = data["sections"].get("oa_deadlines", [])
    assert len(oa_section) >= 1
    assert any("DeadlineCo" in item["title"] for item in oa_section)

    oa_missions = [m for m in data["missions"] if m["section"] == "oa_deadlines"]
    assert len(oa_missions) >= 1
    assert oa_missions[0]["id"] == app_id
    assert "OA due in" in oa_missions[0]["reason"]
