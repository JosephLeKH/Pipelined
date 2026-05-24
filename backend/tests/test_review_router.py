"""Tests for GET /api/review/weekly."""

import pytest
import pytest_asyncio

from tests.conftest import verify_user_by_id

REGISTER_PAYLOAD = {
    "email": "review_api@example.com",
    "password": "password123",
    "display_name": "Review API User",
}


@pytest_asyncio.fixture(loop_scope="session")
async def review_api_user(client):
    resp = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    assert resp.status_code == 201
    uid = resp.json()["data"]["id"]
    await verify_user_by_id(uid)
    cookies = dict(resp.cookies)
    return uid, cookies


@pytest.mark.asyncio(loop_scope="session")
async def test_get_weekly_review_returns_metrics(client, review_api_user):
    _, cookies = review_api_user

    response = await client.get("/api/review/weekly", cookies=cookies)

    assert response.status_code == 200
    data = response.json()["data"]
    assert "week_start" in data
    assert "response_rate" in data
    assert "ghost_rate" in data
    assert "velocity" in data
    assert "stale_applications" in data


@pytest.mark.asyncio(loop_scope="session")
async def test_get_weekly_review_requires_auth(client):
    response = await client.get("/api/review/weekly")

    assert response.status_code == 401


@pytest.mark.asyncio(loop_scope="session")
async def test_get_weekly_review_disabled_returns_404(client, review_api_user):
    _, cookies = review_api_user
    patch = await client.patch(
        "/api/auth/me",
        json={"weekly_review_enabled": False},
        cookies=cookies,
    )
    assert patch.status_code == 200

    response = await client.get("/api/review/weekly", cookies=cookies)

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "WEEKLY_REVIEW_DISABLED"
