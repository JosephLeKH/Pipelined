"""Integration tests for jobs router endpoints."""

from datetime import datetime, timezone

import pytest

from database import get_collection


async def _insert_listing(overrides: dict | None = None) -> dict:
    """Insert a test job listing and return the doc."""
    col = get_collection("job_listings")
    now = datetime.now(timezone.utc)
    doc: dict = {
        "company": "Acme Corp",
        "role": "Software Engineer",
        "location": "San Francisco, CA",
        "remote_status": "hybrid",
        "company_type": "startup",
        "experience_level": "entry",
        "salary_range": "$100k-$130k",
        "apply_url": "https://acme.example.com/jobs/swe",
        "date_posted": now,
        "is_stale": False,
        "ingested_at": now,
    }
    if overrides:
        doc.update(overrides)
    result = await col.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


# ---------------------------------------------------------------------------
# GET /api/jobs
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_jobs_returns_empty_when_no_listings(client):
    # Act
    response = await client.get("/api/jobs")

    # Assert
    assert response.status_code == 200
    body = response.json()
    assert body["data"] == []
    assert body["meta"]["total"] == 0


@pytest.mark.asyncio
async def test_list_jobs_returns_listings(client):
    # Arrange
    await _insert_listing()

    # Act
    response = await client.get("/api/jobs")

    # Assert
    assert response.status_code == 200
    body = response.json()
    assert len(body["data"]) == 1
    assert body["meta"]["total"] == 1
    listing = body["data"][0]
    assert listing["company"] == "Acme Corp"
    assert listing["role"] == "Software Engineer"
    assert listing["is_stale"] is False


@pytest.mark.asyncio
async def test_list_jobs_includes_stale_listings_flagged(client):
    # Arrange
    await _insert_listing({"is_stale": True})

    # Act
    response = await client.get("/api/jobs")

    # Assert
    assert response.status_code == 200
    body = response.json()
    assert len(body["data"]) == 1
    assert body["data"][0]["is_stale"] is True


@pytest.mark.asyncio
async def test_list_jobs_filters_by_remote_status(client):
    # Arrange
    await _insert_listing({"remote_status": "remote"})
    await _insert_listing({"company": "Other Co", "remote_status": "onsite"})

    # Act
    response = await client.get("/api/jobs?remote_status=remote")

    # Assert
    assert response.status_code == 200
    body = response.json()
    assert len(body["data"]) == 1
    assert body["data"][0]["remote_status"] == "remote"


@pytest.mark.asyncio
async def test_list_jobs_filters_by_experience_level(client):
    # Arrange
    await _insert_listing({"experience_level": "senior"})
    await _insert_listing({"company": "Other Co", "experience_level": "entry"})

    # Act
    response = await client.get("/api/jobs?experience_level=senior")

    # Assert
    assert response.status_code == 200
    body = response.json()
    assert len(body["data"]) == 1
    assert body["data"][0]["experience_level"] == "senior"


@pytest.mark.asyncio
async def test_list_jobs_pagination(client):
    # Arrange
    for i in range(5):
        await _insert_listing({"company": f"Company {i}", "role": f"Role {i}"})

    # Act
    response = await client.get("/api/jobs?page=1&per_page=2")

    # Assert
    assert response.status_code == 200
    body = response.json()
    assert len(body["data"]) == 2
    assert body["meta"]["total"] == 5
    assert body["meta"]["per_page"] == 2
    assert body["meta"]["page"] == 1


@pytest.mark.asyncio
async def test_list_jobs_hide_applied_requires_no_auth_to_still_return(client):
    # Arrange — unauthenticated user, hide_applied should just not filter anything
    await _insert_listing()

    # Act
    response = await client.get("/api/jobs?hide_applied=true")

    # Assert
    assert response.status_code == 200
    body = response.json()
    assert len(body["data"]) == 1


@pytest.mark.asyncio
async def test_list_jobs_hide_applied_excludes_applied_listings(client, test_user):
    # Arrange
    _, cookies = test_user
    apply_url = "https://acme.example.com/jobs/swe"
    await _insert_listing({"apply_url": apply_url})

    # Create an application for the same URL
    await client.post(
        "/api/applications",
        json={
            "role_title": "Software Engineer",
            "company": "Acme Corp",
            "source": "board",
            "source_url": apply_url,
        },
        cookies=cookies,
    )

    # Act
    response = await client.get("/api/jobs?hide_applied=true", cookies=cookies)

    # Assert
    assert response.status_code == 200
    body = response.json()
    assert len(body["data"]) == 0


# ---------------------------------------------------------------------------
# GET /api/jobs/:id
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_job_returns_listing(client):
    # Arrange
    doc = await _insert_listing()

    # Act
    response = await client.get(f"/api/jobs/{doc['_id']}")

    # Assert
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["company"] == "Acme Corp"
    assert body["data"]["id"] == str(doc["_id"])


@pytest.mark.asyncio
async def test_get_job_returns_404_for_unknown_id(client):
    # Arrange
    from bson import ObjectId
    fake_id = str(ObjectId())

    # Act
    response = await client.get(f"/api/jobs/{fake_id}")

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "JOB_NOT_FOUND"


@pytest.mark.asyncio
async def test_get_job_returns_404_for_invalid_id(client):
    # Act
    response = await client.get("/api/jobs/not-a-valid-id")

    # Assert
    assert response.status_code == 404
