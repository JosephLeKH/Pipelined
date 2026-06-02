"""Integration tests for jobs router endpoints."""

import hashlib
from datetime import datetime, timezone

import pytest

from database import get_collection

pytestmark = pytest.mark.asyncio(loop_scope="session")


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
        "date_posted": now,
        "is_stale": False,
        "ingested_at": now,
    }
    if overrides:
        doc.update(overrides)
    slug = doc["company"].lower().replace(" ", "-")
    apply_url = doc.get("apply_url") or f"https://{slug}.example.com/jobs/swe"
    doc["apply_url"] = apply_url
    doc["url_hash"] = hashlib.sha256(apply_url.lower().strip().encode()).hexdigest()
    result = await col.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


# ---------------------------------------------------------------------------
# GET /api/jobs
# ---------------------------------------------------------------------------


async def test_list_jobs_returns_empty_when_no_listings(client):
    # Act
    response = await client.get("/api/jobs")

    # Assert
    assert response.status_code == 200
    body = response.json()
    assert body["data"] == []
    assert body["meta"]["total"] == 0


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


async def test_list_jobs_hide_applied_requires_no_auth_to_still_return(client):
    # Arrange — unauthenticated user, hide_applied should just not filter anything
    await _insert_listing()

    # Act
    response = await client.get("/api/jobs?hide_applied=true")

    # Assert
    assert response.status_code == 200
    body = response.json()
    assert len(body["data"]) == 1


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


async def test_list_jobs_text_search_filters_by_keyword(client):
    # Arrange
    await _insert_listing({"role": "Backend Engineer", "company": "DataFlow Inc"})
    await _insert_listing({"role": "Product Designer", "company": "Acme Corp"})

    # Act
    response = await client.get("/api/jobs?q=DataFlow")

    # Assert
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["total"] == 1
    assert body["data"][0]["company"] == "DataFlow Inc"


async def test_list_jobs_text_search_combines_with_filters(client):
    # Arrange
    await _insert_listing({"role": "Backend Engineer", "company": "DataFlow Inc", "remote_status": "remote"})
    await _insert_listing({"role": "Backend Engineer", "company": "OtherCo", "remote_status": "onsite"})

    # Act
    response = await client.get("/api/jobs?q=Backend+Engineer&remote_status=remote")

    # Assert
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["total"] == 1
    assert body["data"][0]["remote_status"] == "remote"


# ---------------------------------------------------------------------------
# GET /api/jobs/:id
# ---------------------------------------------------------------------------


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


async def test_get_job_returns_404_for_unknown_id(client):
    # Arrange
    from bson import ObjectId
    fake_id = str(ObjectId())

    # Act
    response = await client.get(f"/api/jobs/{fake_id}")

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "JOB_NOT_FOUND"


async def test_get_job_returns_404_for_invalid_id(client):
    # Act
    response = await client.get("/api/jobs/not-a-valid-id")

    # Assert
    assert response.status_code == 404


async def test_list_jobs_sort_newest_orders_by_ingested_desc(client):
    """sort=newest returns most-recently-ingested first regardless of date_posted."""
    # Arrange — listings ingested in known order; pick deliberately scrambled date_posted
    from datetime import timedelta
    base = datetime(2026, 5, 1, tzinfo=timezone.utc)
    await _insert_listing({
        "company": "Old Co", "apply_url": "https://old.example.com/jobs/a",
        "ingested_at": base, "date_posted": base + timedelta(days=10),
    })
    await _insert_listing({
        "company": "New Co", "apply_url": "https://new.example.com/jobs/a",
        "ingested_at": base + timedelta(days=5), "date_posted": base,
    })

    # Act
    response = await client.get("/api/jobs?sort=newest")

    # Assert — newest ingested first
    assert response.status_code == 200
    companies = [j["company"] for j in response.json()["data"]]
    assert companies == ["New Co", "Old Co"]


async def test_list_jobs_sort_oldest_orders_by_ingested_asc(client):
    """sort=oldest returns oldest-ingested first; pagination stays consistent."""
    from datetime import timedelta
    base = datetime(2026, 5, 1, tzinfo=timezone.utc)
    await _insert_listing({
        "company": "First", "apply_url": "https://first.example.com/jobs/a",
        "ingested_at": base,
    })
    await _insert_listing({
        "company": "Second", "apply_url": "https://second.example.com/jobs/a",
        "ingested_at": base + timedelta(days=1),
    })
    await _insert_listing({
        "company": "Third", "apply_url": "https://third.example.com/jobs/a",
        "ingested_at": base + timedelta(days=2),
    })

    # Act
    response = await client.get("/api/jobs?sort=oldest")

    # Assert
    assert response.status_code == 200
    companies = [j["company"] for j in response.json()["data"]]
    assert companies == ["First", "Second", "Third"]


async def test_list_jobs_sort_overrides_text_score(client):
    """Explicit sort overrides text score sort so users always get date order when they pick it."""
    from datetime import timedelta
    base = datetime(2026, 5, 1, tzinfo=timezone.utc)
    await _insert_listing({
        "company": "Match A", "role": "Engineer Engineer Engineer",  # higher text score
        "apply_url": "https://a.example.com/jobs/a",
        "ingested_at": base,
    })
    await _insert_listing({
        "company": "Match B", "role": "Engineer",  # lower text score
        "apply_url": "https://b.example.com/jobs/a",
        "ingested_at": base + timedelta(days=5),
    })

    # Act — with sort=newest, B (newer) should come first even though A has higher text score
    response = await client.get("/api/jobs?q=Engineer&sort=newest")

    # Assert
    assert response.status_code == 200
    companies = [j["company"] for j in response.json()["data"]]
    assert companies[0] == "Match B"


async def test_list_jobs_filters_by_salary_range(client):
    """salary_min and salary_max should filter by salary_min_value field."""
    # Arrange — one low-salary, one high-salary listing with distinct apply_urls
    await _insert_listing({"salary_min_value": 80_000, "apply_url": "https://lowsal.example.com/jobs/a"})
    await _insert_listing({"salary_min_value": 160_000, "apply_url": "https://highsal.example.com/jobs/a"})

    # Act — salary_min=120000 should include only high-salary listing
    resp_min = await client.get("/api/jobs?salary_min=120000")
    # Act — salary_max=100000 should include only low-salary listing
    resp_max = await client.get("/api/jobs?salary_max=100000")

    # Assert
    assert resp_min.status_code == 200
    assert resp_max.status_code == 200
    # No listing in resp_min should have salary_min_value below 120000
    # (we can check apply_url since we control the inserted docs)
    min_urls = [j.get("apply_url") for j in resp_min.json()["data"]]
    assert "https://lowsal.example.com/jobs/a" not in min_urls
    assert "https://highsal.example.com/jobs/a" in min_urls

    max_urls = [j.get("apply_url") for j in resp_max.json()["data"]]
    assert "https://highsal.example.com/jobs/a" not in max_urls
    assert "https://lowsal.example.com/jobs/a" in max_urls
