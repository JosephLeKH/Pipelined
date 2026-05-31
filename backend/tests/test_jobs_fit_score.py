"""Integration tests for POST /api/jobs/{listing_id}/fit-score."""

import hashlib
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest

from database import get_collection

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def _insert_listing() -> str:
    col = get_collection("job_listings")
    now = datetime.now(timezone.utc)
    apply_url = "https://acme.example.com/jobs/swe"
    doc = {
        "company": "Acme Corp",
        "role": "Software Engineer",
        "location": "San Francisco, CA",
        "description": "Build cool things with Python and React.",
        "apply_url": apply_url,
        "url_hash": hashlib.sha256(apply_url.encode()).hexdigest(),
        "date_posted": now,
        "ingested_at": now,
        "is_stale": False,
    }
    result = await col.insert_one(doc)
    return str(result.inserted_id)


async def _set_resume(user_id: str, resume_text: str) -> None:
    from bson import ObjectId
    await get_collection("users").update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"resume_text": resume_text}},
    )


async def test_score_listing_returns_404_for_missing_listing(client, test_user):
    _, cookies = test_user

    response = await client.post(
        "/api/jobs/000000000000000000000000/fit-score",
        cookies=cookies,
    )

    assert response.status_code == 404


async def test_score_listing_returns_404_for_invalid_id(client, test_user):
    _, cookies = test_user

    response = await client.post("/api/jobs/not-an-objectid/fit-score", cookies=cookies)

    assert response.status_code == 404


async def test_score_listing_returns_null_when_no_resume(client, test_user):
    _, cookies = test_user
    listing_id = await _insert_listing()

    response = await client.post(f"/api/jobs/{listing_id}/fit-score", cookies=cookies)

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["score"] is None
    assert data["cached"] is False


@patch("jobs.fit_score.score_fit", new_callable=AsyncMock)
async def test_score_listing_persists_and_caches(mock_score_fit, client, test_user):
    user, cookies = test_user
    await _set_resume(user["id"], "Python and React experience.")
    listing_id = await _insert_listing()
    mock_score_fit.return_value = {
        "fit_score": 82,
        "matched_skills": ["Python"],
        "missing_skills": [],
        "summary": "Strong match.",
    }

    first = await client.post(f"/api/jobs/{listing_id}/fit-score", cookies=cookies)
    second = await client.post(f"/api/jobs/{listing_id}/fit-score", cookies=cookies)

    assert first.status_code == 200
    assert first.json()["data"]["score"] == 82
    assert first.json()["data"]["cached"] is False
    assert second.status_code == 200
    assert second.json()["data"]["score"] == 82
    assert second.json()["data"]["cached"] is True
    mock_score_fit.assert_awaited_once()
