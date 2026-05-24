"""Tests for GET /api/brief/today and /history."""

import pytest
import pytest_asyncio

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
