"""Integration tests for saved searches endpoints."""

import pytest

from database import get_collection
from tests.conftest import verify_user_by_id

pytestmark = pytest.mark.asyncio(loop_scope="session")

SEARCH_PAYLOAD = {
    "name": "SWE Intern Remote",
    "query": "software engineer intern",
    "filters": {
        "remote_status": "remote",
    },
}


# ---------------------------------------------------------------------------
# POST /api/saved-searches
# ---------------------------------------------------------------------------


async def test_create_saved_search_returns_201(client, test_user):
    # Arrange
    _, cookies = test_user

    # Act
    response = await client.post("/api/saved-searches", json=SEARCH_PAYLOAD, cookies=cookies)

    # Assert
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["name"] == "SWE Intern Remote"
    assert data["query"] == "software engineer intern"
    assert data["filters"]["remote_status"] == "remote"
    assert data["new_matches_count"] == 0
    assert data["last_checked_at"] is None
    assert "id" in data


async def test_create_saved_search_returns_401_without_auth(client):
    # Act
    response = await client.post("/api/saved-searches", json=SEARCH_PAYLOAD)

    # Assert
    assert response.status_code == 401


async def test_create_saved_search_returns_409_when_limit_reached(client, test_user):
    # Arrange
    _, cookies = test_user
    for i in range(10):
        payload = {"name": f"Search {i}", "query": f"query {i}"}
        resp = await client.post("/api/saved-searches", json=payload, cookies=cookies)
        assert resp.status_code == 201

    # Act — 11th search should fail
    response = await client.post(
        "/api/saved-searches",
        json={"name": "Overflow Search", "query": "overflow"},
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 409


# ---------------------------------------------------------------------------
# GET /api/saved-searches
# ---------------------------------------------------------------------------


async def test_list_saved_searches_returns_200(client, test_user):
    # Arrange
    _, cookies = test_user
    await client.post("/api/saved-searches", json=SEARCH_PAYLOAD, cookies=cookies)

    # Act
    response = await client.get("/api/saved-searches", cookies=cookies)

    # Assert
    assert response.status_code == 200
    data = response.json()["data"]
    assert isinstance(data, list)
    assert any(d["name"] == "SWE Intern Remote" for d in data)


async def test_list_saved_searches_returns_401_without_auth(client):
    # Act
    response = await client.get("/api/saved-searches")

    # Assert
    assert response.status_code == 401


async def test_list_saved_searches_does_not_return_other_users_searches(client, test_user):
    # Arrange — create a search for test_user
    _, cookies = test_user
    await client.post("/api/saved-searches", json=SEARCH_PAYLOAD, cookies=cookies)

    # Register and login a second user
    reg_resp = await client.post("/api/auth/register", json={
        "email": "second_ss@example.com",
        "password": "TestPass123!",
        "display_name": "Second User",
    })
    second_cookies = dict(reg_resp.cookies)
    await verify_user_by_id(reg_resp.json()["data"]["id"])

    # Act — second user lists their searches
    response = await client.get("/api/saved-searches", cookies=second_cookies)

    # Assert — second user sees no searches
    assert response.status_code == 200
    assert response.json()["data"] == []


# ---------------------------------------------------------------------------
# DELETE /api/saved-searches/{id}
# ---------------------------------------------------------------------------


async def test_delete_saved_search_returns_204(client, test_user):
    # Arrange
    _, cookies = test_user
    create_resp = await client.post("/api/saved-searches", json=SEARCH_PAYLOAD, cookies=cookies)
    search_id = create_resp.json()["data"]["id"]

    # Act
    response = await client.delete(f"/api/saved-searches/{search_id}", cookies=cookies)

    # Assert
    assert response.status_code == 204

    # Verify it's gone
    list_resp = await client.get("/api/saved-searches", cookies=cookies)
    assert not any(d["id"] == search_id for d in list_resp.json()["data"])


async def test_delete_saved_search_returns_404_for_missing(client, test_user):
    # Arrange
    _, cookies = test_user
    fake_id = "000000000000000000000001"

    # Act
    response = await client.delete(f"/api/saved-searches/{fake_id}", cookies=cookies)

    # Assert
    assert response.status_code == 404


async def test_delete_saved_search_returns_404_for_other_users_search(client, test_user):
    # Arrange — create a search as test_user
    _, cookies = test_user
    create_resp = await client.post("/api/saved-searches", json=SEARCH_PAYLOAD, cookies=cookies)
    search_id = create_resp.json()["data"]["id"]

    # Register second user
    reg_resp = await client.post("/api/auth/register", json={
        "email": "thief_ss@example.com",
        "password": "TestPass123!",
        "display_name": "Thief",
    })
    thief_cookies = dict(reg_resp.cookies)
    await verify_user_by_id(reg_resp.json()["data"]["id"])

    # Act — second user tries to delete first user's search
    response = await client.delete(f"/api/saved-searches/{search_id}", cookies=thief_cookies)

    # Assert
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/saved-searches/{id}/results
# ---------------------------------------------------------------------------


async def test_get_saved_search_results_returns_200(client, test_user):
    # Arrange
    _, cookies = test_user
    create_resp = await client.post("/api/saved-searches", json=SEARCH_PAYLOAD, cookies=cookies)
    search_id = create_resp.json()["data"]["id"]

    # Act
    response = await client.get(f"/api/saved-searches/{search_id}/results", cookies=cookies)

    # Assert
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert "meta" in body
    assert "total" in body["meta"]


async def test_get_saved_search_results_resets_match_count(client, test_user):
    # Arrange
    _, cookies = test_user
    create_resp = await client.post("/api/saved-searches", json=SEARCH_PAYLOAD, cookies=cookies)
    search_id = create_resp.json()["data"]["id"]

    # Act — fetch results (resets new_matches_count to 0)
    await client.get(f"/api/saved-searches/{search_id}/results", cookies=cookies)

    # Verify new_matches_count is 0 in the listing
    list_resp = await client.get("/api/saved-searches", cookies=cookies)
    search = next(d for d in list_resp.json()["data"] if d["id"] == search_id)
    assert search["new_matches_count"] == 0
    assert search["last_checked_at"] is not None


async def test_get_saved_search_results_returns_404_for_missing(client, test_user):
    # Arrange
    _, cookies = test_user
    fake_id = "000000000000000000000002"

    # Act
    response = await client.get(f"/api/saved-searches/{fake_id}/results", cookies=cookies)

    # Assert
    assert response.status_code == 404


async def test_create_saved_search_persists_salary_min_and_sort(client, test_user):
    """Regression: salary_min, salary_max, and sort used to be silently dropped on save."""
    # Arrange
    _, cookies = test_user
    payload = {
        "name": "Comp roles",
        "query": "",
        "filters": {
            "salary_min": 120000,
            "salary_max": 250000,
            "sort": "oldest",
            "date_from": "2026-01-01",
        },
    }

    # Act
    resp = await client.post("/api/saved-searches", json=payload, cookies=cookies)

    # Assert — filters survive a round trip
    assert resp.status_code == 201
    saved_filters = resp.json()["data"]["filters"]
    assert saved_filters["salary_min"] == 120000
    assert saved_filters["salary_max"] == 250000
    assert saved_filters["sort"] == "oldest"
    assert saved_filters["date_from"] == "2026-01-01"


async def test_saved_search_accepts_legacy_min_salary_alias(client, test_user):
    """Legacy DB docs wrote min_salary; load must still surface it as salary_min."""
    # Arrange — write a doc directly with the legacy key
    from bson import ObjectId
    from datetime import datetime, timezone
    user, cookies = test_user
    col = get_collection("saved_searches")
    await col.insert_one({
        "user_id": ObjectId(str(user["_id"])),
        "name": "Legacy",
        "query": "",
        "filters": {"min_salary": 90000, "remote_status": "remote"},
        "last_checked_at": None,
        "new_matches_count": 0,
        "created_at": datetime.now(timezone.utc),
    })

    # Act
    resp = await client.get("/api/saved-searches", cookies=cookies)

    # Assert — alias translates to the canonical field
    assert resp.status_code == 200
    legacy = next(d for d in resp.json()["data"] if d["name"] == "Legacy")
    assert legacy["filters"]["salary_min"] == 90000
    assert legacy["filters"]["remote_status"] == "remote"
