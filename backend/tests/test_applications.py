"""Integration tests for applications router endpoints."""

import pytest

APP_PAYLOAD = {
    "role_title": "Software Engineer",
    "company": "Acme Corp",
    "source": "manual",
}


# ---------------------------------------------------------------------------
# POST /api/applications
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_application_returns_201(client, test_user):
    # Arrange
    _, cookies = test_user

    # Act
    response = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)

    # Assert
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["role_title"] == "Software Engineer"
    assert data["company"] == "Acme Corp"
    assert data["current_stage"] == "Applied"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_application_returns_401_without_auth(client):
    # Act
    response = await client.post("/api/applications", json=APP_PAYLOAD)

    # Assert
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_application_returns_409_on_duplicate(client, test_user):
    # Arrange
    _, cookies = test_user
    await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)

    # Act
    response = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)

    # Assert
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "DUPLICATE_APPLICATION"


@pytest.mark.asyncio
async def test_create_application_returns_422_on_missing_required_field(client, test_user):
    # Arrange
    _, cookies = test_user

    # Act
    response = await client.post(
        "/api/applications", json={"company": "Acme"}, cookies=cookies
    )

    # Assert
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# GET /api/applications/stats  (must come before /{app_id})
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_stats_returns_zeroes_for_empty_pipeline(client, test_user):
    # Arrange
    _, cookies = test_user

    # Act
    response = await client.get("/api/applications/stats", cookies=cookies)

    # Assert
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["total_applied"] == 0
    assert data["active_count"] == 0
    assert data["response_rate"] == 0.0


@pytest.mark.asyncio
async def test_get_stats_counts_created_applications(client, test_user):
    # Arrange
    _, cookies = test_user
    await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    await client.post(
        "/api/applications",
        json={**APP_PAYLOAD, "company": "Beta Inc"},
        cookies=cookies,
    )

    # Act
    response = await client.get("/api/applications/stats", cookies=cookies)

    # Assert
    data = response.json()["data"]
    assert data["total_applied"] == 2
    assert data["active_count"] == 2


@pytest.mark.asyncio
async def test_get_stats_returns_401_without_auth(client):
    # Act
    response = await client.get("/api/applications/stats")

    # Assert
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/applications
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_applications_returns_envelope_with_meta(client, test_user):
    # Arrange
    _, cookies = test_user
    await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)

    # Act
    response = await client.get("/api/applications", cookies=cookies)

    # Assert
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert "meta" in body
    assert body["meta"]["count"] == 1
    assert body["meta"]["next_cursor"] is None


@pytest.mark.asyncio
async def test_list_applications_scoped_to_current_user(client):
    # Arrange — register two separate users
    resp_a = await client.post(
        "/api/auth/register",
        json={"email": "a@test.com", "password": "TestPass123!", "display_name": "A"},
    )
    cookies_a = dict(resp_a.cookies)

    resp_b = await client.post(
        "/api/auth/register",
        json={"email": "b@test.com", "password": "TestPass123!", "display_name": "B"},
    )
    cookies_b = dict(resp_b.cookies)

    await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies_a)
    await client.post(
        "/api/applications",
        json={**APP_PAYLOAD, "company": "Other Co"},
        cookies=cookies_b,
    )

    # Act
    response = await client.get("/api/applications", cookies=cookies_a)

    # Assert
    body = response.json()
    assert body["meta"]["count"] == 1
    assert body["data"][0]["company"] == "Acme Corp"


@pytest.mark.asyncio
async def test_list_applications_pagination_returns_next_cursor(client, test_user):
    # Arrange
    _, cookies = test_user
    for i in range(3):
        await client.post(
            "/api/applications",
            json={**APP_PAYLOAD, "company": f"Corp{i}"},
            cookies=cookies,
        )

    # Act
    response = await client.get("/api/applications?limit=2", cookies=cookies)

    # Assert
    body = response.json()
    assert body["meta"]["count"] == 2
    assert body["meta"]["next_cursor"] is not None


@pytest.mark.asyncio
async def test_list_applications_returns_401_without_auth(client):
    # Act
    response = await client.get("/api/applications")

    # Assert
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/applications/{app_id}
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_application_returns_full_doc(client, test_user):
    # Arrange
    _, cookies = test_user
    create_resp = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    app_id = create_resp.json()["data"]["id"]

    # Act
    response = await client.get(f"/api/applications/{app_id}", cookies=cookies)

    # Assert
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["id"] == app_id
    assert "stage_history" in data


@pytest.mark.asyncio
async def test_get_application_returns_404_for_wrong_user(client):
    # Arrange — two users
    resp_a = await client.post(
        "/api/auth/register",
        json={"email": "owner@test.com", "password": "TestPass123!", "display_name": "Owner"},
    )
    cookies_a = dict(resp_a.cookies)

    resp_b = await client.post(
        "/api/auth/register",
        json={"email": "other@test.com", "password": "TestPass123!", "display_name": "Other"},
    )
    cookies_b = dict(resp_b.cookies)

    create_resp = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies_a)
    app_id = create_resp.json()["data"]["id"]

    # Act
    response = await client.get(f"/api/applications/{app_id}", cookies=cookies_b)

    # Assert
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_application_returns_401_without_auth(client, test_user):
    # Arrange
    _, cookies = test_user
    create_resp = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    app_id = create_resp.json()["data"]["id"]

    # Act
    response = await client.get(f"/api/applications/{app_id}")

    # Assert
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# PATCH /api/applications/{app_id}
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_update_application_returns_updated_doc(client, test_user):
    # Arrange
    _, cookies = test_user
    create_resp = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    app_id = create_resp.json()["data"]["id"]

    # Act
    response = await client.patch(
        f"/api/applications/{app_id}",
        json={"current_stage": "Phone Screen"},
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["current_stage"] == "Phone Screen"


@pytest.mark.asyncio
async def test_update_application_returns_404_for_missing_app(client, test_user):
    # Arrange
    _, cookies = test_user
    fake_id = "000000000000000000000001"

    # Act
    response = await client.patch(
        f"/api/applications/{fake_id}",
        json={"compensation": "$100k"},
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_application_returns_401_without_auth(client, test_user):
    # Arrange
    _, cookies = test_user
    create_resp = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    app_id = create_resp.json()["data"]["id"]

    # Act
    response = await client.patch(f"/api/applications/{app_id}", json={"compensation": "$100k"})

    # Assert
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# DELETE /api/applications/{app_id}
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_application_returns_204(client, test_user):
    # Arrange
    _, cookies = test_user
    create_resp = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    app_id = create_resp.json()["data"]["id"]

    # Act
    response = await client.delete(f"/api/applications/{app_id}", cookies=cookies)

    # Assert
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_delete_application_removes_from_list(client, test_user):
    # Arrange
    _, cookies = test_user
    create_resp = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    app_id = create_resp.json()["data"]["id"]
    await client.delete(f"/api/applications/{app_id}", cookies=cookies)

    # Act
    response = await client.get("/api/applications", cookies=cookies)

    # Assert
    assert response.json()["meta"]["count"] == 0


@pytest.mark.asyncio
async def test_delete_application_returns_404_for_missing_app(client, test_user):
    # Arrange
    _, cookies = test_user
    fake_id = "000000000000000000000001"

    # Act
    response = await client.delete(f"/api/applications/{fake_id}", cookies=cookies)

    # Assert
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_application_returns_401_without_auth(client, test_user):
    # Arrange
    _, cookies = test_user
    create_resp = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    app_id = create_resp.json()["data"]["id"]

    # Act
    response = await client.delete(f"/api/applications/{app_id}")

    # Assert
    assert response.status_code == 401
