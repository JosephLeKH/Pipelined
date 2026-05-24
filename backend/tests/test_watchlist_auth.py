"""Tests for watchlist_companies on user profile."""

import pytest

from auth.url_validation import validate_public_http_url

BLOCKED_CAREERS_URLS = [
    "http://127.0.0.1/careers",
    "http://localhost/jobs",
    "http://10.0.0.1/careers",
    "http://192.168.1.1/jobs",
    "http://169.254.169.254/latest/meta-data",
]


@pytest.mark.parametrize("url", BLOCKED_CAREERS_URLS)
def test_validate_public_http_url_rejects_internal_targets(url: str):
    with pytest.raises(ValueError, match="private or internal"):
        validate_public_http_url(url)


def test_validate_public_http_url_allows_public_host():
    validate_public_http_url("https://boards.greenhouse.io/acme")


@pytest.mark.asyncio(loop_scope="session")
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


@pytest.mark.asyncio(loop_scope="session")
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


@pytest.mark.asyncio(loop_scope="session")
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


@pytest.mark.asyncio(loop_scope="session")
async def test_patch_me_rejects_private_ip_careers_url(client):
    reg = await client.post("/api/auth/register", json={
        "email": "watchlist_ssrf@example.com",
        "password": "password123",
        "display_name": "Watchlist SSRF",
    })
    cookies = dict(reg.cookies)

    response = await client.patch(
        "/api/auth/me",
        json={
            "watchlist_companies": [
                {"name": "Internal", "careers_url": "http://127.0.0.1/careers"},
            ],
        },
        cookies=cookies,
    )

    assert response.status_code == 422
