"""Tests for watchlist scan job."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from bson import ObjectId

import database
from jobs.sync import compute_url_hash
from watchlist.parser import parse_greenhouse_jobs, parse_html_listings
from watchlist.scan import watchlist_scan


GREENHOUSE_PAYLOAD = [
    {
        "id": 123,
        "title": "Backend Engineer",
        "absolute_url": "https://boards.greenhouse.io/acme/jobs/123",
        "location": {"name": "Remote"},
    },
]


def test_parse_greenhouse_jobs_extracts_listings():
    listings = parse_greenhouse_jobs(GREENHOUSE_PAYLOAD, "Acme", "https://boards.greenhouse.io/acme")

    assert len(listings) == 1
    assert listings[0]["company"] == "Acme"
    assert listings[0]["role"] == "Backend Engineer"
    assert listings[0]["apply_url"] == "https://boards.greenhouse.io/acme/jobs/123"


def test_parse_html_listings_extracts_job_links():
    html = '<html><body><a href="/jobs/backend">Backend Engineer</a></body></html>'
    listings = parse_html_listings(html, "Acme", "https://example.com/careers")

    assert len(listings) == 1
    assert listings[0]["role"] == "Backend Engineer"
    assert listings[0]["apply_url"] == "https://example.com/jobs/backend"


@pytest.mark.asyncio(loop_scope="session")
async def test_watchlist_scan_skips_blocked_careers_url(app, test_user):
    user, _ = test_user
    uid = ObjectId(user["id"])

    await database.get_collection("users").update_one(
        {"_id": uid},
        {"$set": {
            "watchlist_companies": [
                {"name": "Internal", "careers_url": "http://127.0.0.1/careers"},
            ],
        }},
    )

    with patch("watchlist.scan.fetch_api_listings", new_callable=AsyncMock) as mock_fetch:
        await watchlist_scan()
        mock_fetch.assert_not_called()


@pytest.mark.asyncio(loop_scope="session")
async def test_watchlist_scan_client_disables_redirects(app, test_user):
    user, _ = test_user
    uid = ObjectId(user["id"])

    await database.get_collection("users").update_one(
        {"_id": uid},
        {"$set": {
            "watchlist_companies": [
                {"name": "Acme", "careers_url": "https://boards.greenhouse.io/acme"},
            ],
        }},
    )

    captured: dict = {}

    class _ClientFactory:
        def __init__(self, *args, **kwargs):
            captured["follow_redirects"] = kwargs.get("follow_redirects")

        async def __aenter__(self):
            client = MagicMock()
            client.get = AsyncMock()
            return client

        async def __aexit__(self, *args):
            return None

    with patch("watchlist.scan.httpx.AsyncClient", _ClientFactory), patch(
        "watchlist.scan.fetch_api_listings", new_callable=AsyncMock, return_value=[]
    ):
        await watchlist_scan()

    assert captured.get("follow_redirects") is False


@pytest.mark.asyncio(loop_scope="session")
async def test_watchlist_scan_upserts_with_url_hash_dedupe(app, test_user):
    user, _ = test_user
    uid = ObjectId(user["id"])
    apply_url = "https://boards.greenhouse.io/acme/jobs/123"
    url_hash = compute_url_hash(apply_url)

    await database.get_collection("users").update_one(
        {"_id": uid},
        {"$set": {
            "watchlist_companies": [
                {"name": "Acme", "careers_url": "https://boards.greenhouse.io/acme"},
            ],
        }},
    )
    await database.get_collection("job_listings").insert_one({
        "company": "Acme",
        "role": "Existing",
        "apply_url": apply_url,
        "url_hash": url_hash,
        "ingested_at": datetime.now(timezone.utc),
    })

    with patch("watchlist.scan.fetch_api_listings", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = parse_greenhouse_jobs(
            GREENHOUSE_PAYLOAD,
            "Acme",
            "https://boards.greenhouse.io/acme",
        )
        await watchlist_scan()

    listings = await database.get_collection("job_listings").find({"url_hash": url_hash}).to_list(length=5)
    assert len(listings) == 1
    assert listings[0]["role"] == "Backend Engineer"
    assert "watchlist_user_id" not in listings[0]


@pytest.mark.asyncio(loop_scope="session")
async def test_watchlist_scan_sets_watchlist_user_id_on_insert(app, test_user):
    user, _ = test_user
    uid = ObjectId(user["id"])
    apply_url = "https://boards.greenhouse.io/acme/jobs/456"
    url_hash = compute_url_hash(apply_url)

    await database.get_collection("users").update_one(
        {"_id": uid},
        {"$set": {
            "watchlist_companies": [
                {"name": "Acme", "careers_url": "https://boards.greenhouse.io/acme"},
            ],
        }},
    )

    payload = [{
        "id": 456,
        "title": "Platform Engineer",
        "absolute_url": apply_url,
        "location": {"name": "Remote"},
    }]

    with patch("watchlist.scan.fetch_api_listings", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = parse_greenhouse_jobs(
            payload,
            "Acme",
            "https://boards.greenhouse.io/acme",
        )
        await watchlist_scan()

    listing = await database.get_collection("job_listings").find_one({"url_hash": url_hash})
    assert listing is not None
    assert listing["watchlist_user_id"] == uid
