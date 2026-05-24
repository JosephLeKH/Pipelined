"""Tests for watchlist_companies on user profile."""

import pytest

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_get_me_includes_empty_watchlist(client):
    reg = await client.post("/api/auth/register", json={
        "email": "watchlist_empty@example.com",
        "password": "password123",
        "display_name": "Watchlist Empty",
    })
    cookies = dict(reg.cookies)

    response = await client.get("/api/auth/me", cookies=cookies)

    assert response.status_code == 200
    assert response.json()["data"]["watchlist_companies"] == []


async def test_patch_me_updates_watchlist_companies(client):
    reg = await client.post("/api/auth/register", json={
        "email": "watchlist_update@example.com",
        "password": "password123",
        "display_name": "Watchlist User",
    })
    cookies = dict(reg.cookies)

    response = await client.patch(
        "/api/auth/me",
        json={
            "watchlist_companies": [
                {"name": "Acme", "careers_url": "https://boards.greenhouse.io/acme"},
                {"name": "Beta", "careers_url": "https://jobs.lever.co/beta"},
            ],
        },
        cookies=cookies,
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data["watchlist_companies"]) == 2
    assert data["watchlist_companies"][0]["name"] == "Acme"
    assert data["watchlist_companies"][1]["careers_url"] == "https://jobs.lever.co/beta"


async def test_patch_me_rejects_invalid_watchlist_url(client):
    reg = await client.post("/api/auth/register", json={
        "email": "watchlist_invalid@example.com",
        "password": "password123",
        "display_name": "Watchlist Invalid",
    })
    cookies = dict(reg.cookies)

    response = await client.patch(
        "/api/auth/me",
        json={
            "watchlist_companies": [
                {"name": "Acme", "careers_url": "ftp://example.com/careers"},
            ],
        },
        cookies=cookies,
    )

    assert response.status_code == 422
