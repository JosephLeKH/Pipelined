"""Tests for watchlist scan job."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

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

    mock_response = AsyncMock()
    mock_response.raise_for_status = lambda: None
    mock_response.json.return_value = {"jobs": GREENHOUSE_PAYLOAD}

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
    assert listings[0]["watchlist_user_id"] == uid
