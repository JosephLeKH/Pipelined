"""Integration tests for applications router endpoints."""

from datetime import datetime, timedelta, timezone

import pytest

from database import get_collection

# Use session-scoped event loop for all tests so Motor's connection pool
# (bound to the session loop in the `app` fixture) is reachable from test bodies.
pytestmark = pytest.mark.asyncio(loop_scope="session")

APP_PAYLOAD = {
    "role_title": "Software Engineer",
    "company": "Acme Corp",
    "source": "manual",
}


# ---------------------------------------------------------------------------
# POST /api/applications
# ---------------------------------------------------------------------------


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


async def test_create_application_returns_401_without_auth(client):
    # Act
    response = await client.post("/api/applications", json=APP_PAYLOAD)

    # Assert
    assert response.status_code == 401


async def test_create_application_returns_409_on_duplicate(client, test_user):
    # Arrange
    _, cookies = test_user
    await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)

    # Act
    response = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)

    # Assert
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "DUPLICATE_APPLICATION"


async def test_create_application_returns_409_on_case_insensitive_duplicate(client, test_user):
    # Arrange
    _, cookies = test_user
    await client.post(
        "/api/applications",
        json={"role_title": "Stripe SWE Intern", "company": "Stripe", "source": "manual"},
        cookies=cookies,
    )

    # Act — same role/company with different casing
    response = await client.post(
        "/api/applications",
        json={"role_title": "stripe swe intern", "company": "stripe", "source": "manual"},
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "DUPLICATE_APPLICATION"


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


async def test_get_stats_returns_401_without_auth(client):
    # Act
    response = await client.get("/api/applications/stats")

    # Assert
    assert response.status_code == 401


async def test_get_stats_stale_count_counts_active_stale_applications(client, test_user):
    # Arrange — create two applications
    user, cookies = test_user
    resp1 = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    resp2 = await client.post(
        "/api/applications",
        json={**APP_PAYLOAD, "company": "Beta Inc"},
        cookies=cookies,
    )
    app1_id = resp1.json()["data"]["id"]
    app2_id = resp2.json()["data"]["id"]

    # Back-date app1's updated_at to 20 days ago (stale)
    stale_date = datetime.now(timezone.utc) - timedelta(days=20)
    apps = get_collection("applications")
    from bson import ObjectId
    await apps.update_one({"_id": ObjectId(app1_id)}, {"$set": {"updated_at": stale_date}})

    # Act
    response = await client.get("/api/applications/stats", cookies=cookies)

    # Assert — only app1 is stale, app2 was just created
    data = response.json()["data"]
    assert data["stale_count"] == 1


# ---------------------------------------------------------------------------
# GET /api/applications
# ---------------------------------------------------------------------------


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


async def test_list_applications_empty_collection_returns_empty_data(client, test_user):
    # Arrange — no applications created for this user

    _, cookies = test_user

    # Act
    response = await client.get("/api/applications", cookies=cookies)

    # Assert
    assert response.status_code == 200
    body = response.json()
    assert body["data"] == []
    assert body["meta"]["next_cursor"] is None
    assert body["meta"]["count"] == 0


async def test_list_applications_returns_401_without_auth(client):
    # Act
    response = await client.get("/api/applications")

    # Assert
    assert response.status_code == 401


async def test_list_applications_returns_400_for_invalid_cursor(client, test_user):
    # Arrange
    _, cookies = test_user

    # Act — pass a cursor that cannot be parsed as a text-search composite cursor
    resp = await client.get(
        "/api/applications",
        params={"q": "hello", "cursor": "not-a-valid-cursor"},
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 400
    assert resp.json()["detail"]["code"] == "INVALID_CURSOR"


async def test_list_applications_returns_400_for_invalid_plain_cursor(client, test_user):
    # Arrange
    _, cookies = test_user

    # Act — pass a cursor that is not a valid ObjectId
    resp = await client.get(
        "/api/applications",
        params={"cursor": "not-an-objectid"},
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 400
    assert resp.json()["detail"]["code"] == "INVALID_CURSOR"


async def test_list_applications_text_search_returns_matching_application(client, test_user):
    # Arrange — insert two applications with distinct role titles
    _, cookies = test_user
    await client.post(
        "/api/applications",
        json={"role_title": "Backend Python Engineer", "company": "Acme Corp", "source": "manual"},
        cookies=cookies,
    )
    await client.post(
        "/api/applications",
        json={"role_title": "Product Designer", "company": "Beta Inc", "source": "manual"},
        cookies=cookies,
    )

    # Act — search for a keyword present only in the first application
    response = await client.get("/api/applications?q=Python", cookies=cookies)

    # Assert — only the matching application is returned
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["count"] == 1
    assert body["data"][0]["role_title"] == "Backend Python Engineer"


# ---------------------------------------------------------------------------
# GET /api/applications/{app_id}
# ---------------------------------------------------------------------------


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


async def test_delete_application_returns_204(client, test_user):
    # Arrange
    _, cookies = test_user
    create_resp = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    app_id = create_resp.json()["data"]["id"]

    # Act
    response = await client.delete(f"/api/applications/{app_id}", cookies=cookies)

    # Assert
    assert response.status_code == 204


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


async def test_delete_application_returns_404_for_missing_app(client, test_user):
    # Arrange
    _, cookies = test_user
    fake_id = "000000000000000000000001"

    # Act
    response = await client.delete(f"/api/applications/{fake_id}", cookies=cookies)

    # Assert
    assert response.status_code == 404


async def test_delete_application_returns_401_without_auth(client, test_user):
    # Arrange
    _, cookies = test_user
    create_resp = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    app_id = create_resp.json()["data"]["id"]

    # Act
    response = await client.delete(f"/api/applications/{app_id}")

    # Assert
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# PATCH /api/applications/{app_id}/archive and /unarchive
# ---------------------------------------------------------------------------


async def test_archive_application_returns_200_with_archived_true(client, test_user):
    # Arrange
    _, cookies = test_user
    create_resp = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    app_id = create_resp.json()["data"]["id"]

    # Act
    response = await client.patch(f"/api/applications/{app_id}/archive", cookies=cookies)

    # Assert
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["archived"] is True
    assert data["archived_at"] is not None


async def test_unarchive_application_returns_200_with_archived_false(client, test_user):
    # Arrange
    _, cookies = test_user
    create_resp = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    app_id = create_resp.json()["data"]["id"]
    await client.patch(f"/api/applications/{app_id}/archive", cookies=cookies)

    # Act
    response = await client.patch(f"/api/applications/{app_id}/unarchive", cookies=cookies)

    # Assert
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["archived"] is False
    assert data["archived_at"] is None


async def test_list_applications_excludes_archived_by_default(client, test_user):
    # Arrange
    _, cookies = test_user
    create_resp = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    app_id = create_resp.json()["data"]["id"]
    await client.patch(f"/api/applications/{app_id}/archive", cookies=cookies)

    # Act — no include_archived param
    response = await client.get("/api/applications", cookies=cookies)

    # Assert — archived app not returned
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["count"] == 0


async def test_list_applications_includes_archived_when_param_is_true(client, test_user):
    # Arrange
    _, cookies = test_user
    create_resp = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    app_id = create_resp.json()["data"]["id"]
    await client.patch(f"/api/applications/{app_id}/archive", cookies=cookies)

    # Act — pass include_archived=true
    response = await client.get("/api/applications?include_archived=true", cookies=cookies)

    # Assert — archived app returned
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["count"] == 1
    assert body["data"][0]["archived"] is True


async def test_archive_application_returns_404_for_missing_app(client, test_user):
    # Arrange
    _, cookies = test_user
    fake_id = "000000000000000000000001"

    # Act
    response = await client.patch(f"/api/applications/{fake_id}/archive", cookies=cookies)

    # Assert
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# POST /api/applications/{app_id}/stages
# ---------------------------------------------------------------------------


async def test_add_stage_inserts_at_given_position(client, test_user):
    # Arrange
    _, cookies = test_user
    create_resp = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    app_id = create_resp.json()["data"]["id"]

    # Act
    response = await client.post(
        f"/api/applications/{app_id}/stages",
        json={"name": "Technical Screen", "position": 1},
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 200
    stages = response.json()["data"]["stages"]
    assert "Technical Screen" in stages
    assert stages.index("Technical Screen") == 1


async def test_add_stage_returns_404_for_missing_app(client, test_user):
    # Arrange
    _, cookies = test_user
    fake_id = "000000000000000000000001"

    # Act
    response = await client.post(
        f"/api/applications/{fake_id}/stages",
        json={"name": "Custom", "position": 0},
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /api/applications/{app_id}/stages/{stage_name}
# ---------------------------------------------------------------------------


async def test_remove_stage_removes_inactive_stage(client, test_user):
    # Arrange
    _, cookies = test_user
    create_resp = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    app_id = create_resp.json()["data"]["id"]

    # Add a custom stage then remove it
    await client.post(
        f"/api/applications/{app_id}/stages",
        json={"name": "Custom Stage", "position": 1},
        cookies=cookies,
    )

    # Act
    response = await client.delete(
        f"/api/applications/{app_id}/stages/Custom Stage",
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 200
    stages = response.json()["data"]["stages"]
    assert "Custom Stage" not in stages


async def test_remove_stage_returns_409_when_stage_is_active(client, test_user):
    # Arrange
    _, cookies = test_user
    create_resp = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    app_id = create_resp.json()["data"]["id"]

    # Act — try to remove the currently active stage ("Applied")
    response = await client.delete(
        f"/api/applications/{app_id}/stages/Applied",
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "STAGE_ACTIVE"


async def test_remove_stage_returns_404_for_missing_app(client, test_user):
    # Arrange
    _, cookies = test_user
    fake_id = "000000000000000000000001"

    # Act
    response = await client.delete(
        f"/api/applications/{fake_id}/stages/Applied",
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/applications/export
# ---------------------------------------------------------------------------


async def test_export_csv_returns_csv_with_correct_structure(client, test_user):
    # Arrange
    _, cookies = test_user
    await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    await client.post(
        "/api/applications",
        json={**APP_PAYLOAD, "company": "Beta Inc"},
        cookies=cookies,
    )

    # Act
    response = await client.get("/api/applications/export", cookies=cookies)

    # Assert
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    lines = [ln.rstrip("\r") for ln in response.text.strip().split("\n") if ln.strip("\r")]
    expected_header = "id,role_title,company,stage,location,remote_status,compensation,company_type,tags,applied_at,updated_at,notes"
    assert lines[0] == expected_header
    assert len(lines[0].split(",")) == 12
    assert len(lines) == 3  # header + 2 data rows


async def test_export_csv_excludes_archived_by_default(client, test_user):
    # Arrange
    _, cookies = test_user
    resp = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    app_id = resp.json()["data"]["id"]
    await client.patch(f"/api/applications/{app_id}/archive", cookies=cookies)

    # Act
    response = await client.get("/api/applications/export", cookies=cookies)

    # Assert
    lines = [ln.rstrip("\r") for ln in response.text.strip().split("\n") if ln.strip("\r")]
    assert len(lines) == 1  # header only; archived app excluded


async def test_export_csv_includes_archived_when_param_is_true(client, test_user):
    # Arrange
    _, cookies = test_user
    resp = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    app_id = resp.json()["data"]["id"]
    await client.patch(f"/api/applications/{app_id}/archive", cookies=cookies)

    # Act
    response = await client.get("/api/applications/export?include_archived=true", cookies=cookies)

    # Assert
    lines = [ln.rstrip("\r") for ln in response.text.strip().split("\n") if ln.strip("\r")]
    assert len(lines) == 2  # header + archived row


async def test_export_csv_returns_401_without_auth(client):
    # Act
    response = await client.get("/api/applications/export")

    # Assert
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# DELETE /api/applications/bulk
# ---------------------------------------------------------------------------


async def test_bulk_delete_removes_applications_and_returns_count(client, test_user):
    # Arrange
    _, cookies = test_user
    r1 = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    r2 = await client.post(
        "/api/applications", json={**APP_PAYLOAD, "company": "Beta Inc"}, cookies=cookies
    )
    id1 = r1.json()["data"]["id"]
    id2 = r2.json()["data"]["id"]

    # Act
    response = await client.request(
        "DELETE", "/api/applications/bulk", json={"ids": [id1, id2]}, cookies=cookies
    )

    # Assert
    assert response.status_code == 200
    assert response.json()["data"]["deleted_count"] == 2
    get1 = await client.get(f"/api/applications/{id1}", cookies=cookies)
    assert get1.status_code == 404


async def test_bulk_delete_returns_422_on_empty_ids(client, test_user):
    # Arrange
    _, cookies = test_user

    # Act
    response = await client.request(
        "DELETE", "/api/applications/bulk", json={"ids": []}, cookies=cookies
    )

    # Assert
    assert response.status_code == 422


async def test_bulk_delete_returns_422_on_too_many_ids(client, test_user):
    # Arrange
    _, cookies = test_user
    ids = ["aaaaaaaaaaaaaaaaaaaaaaaa"] * 101

    # Act
    response = await client.request(
        "DELETE", "/api/applications/bulk", json={"ids": ids}, cookies=cookies
    )

    # Assert
    assert response.status_code == 422


async def test_bulk_delete_only_deletes_own_applications(client, test_user):
    # Arrange
    _, cookies = test_user
    resp_other = await client.post("/api/auth/register", json={
        "email": "bulkother@example.com",
        "password": "OtherPass123!",
        "display_name": "Other User",
    })
    other_cookies = dict(resp_other.cookies)
    r_other = await client.post("/api/applications", json=APP_PAYLOAD, cookies=other_cookies)
    other_id = r_other.json()["data"]["id"]

    # Act — attempt to delete another user's application
    response = await client.request(
        "DELETE", "/api/applications/bulk", json={"ids": [other_id]}, cookies=cookies
    )

    # Assert — deleted_count is 0; other user's app is untouched
    assert response.status_code == 200
    assert response.json()["data"]["deleted_count"] == 0
    verify = await client.get(f"/api/applications/{other_id}", cookies=other_cookies)
    assert verify.status_code == 200


# ---------------------------------------------------------------------------
# PATCH /api/applications/bulk-stage
# ---------------------------------------------------------------------------


async def test_bulk_stage_update_updates_stage_and_returns_count(client, test_user):
    # Arrange
    _, cookies = test_user
    r1 = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    r2 = await client.post(
        "/api/applications", json={**APP_PAYLOAD, "company": "Beta Inc"}, cookies=cookies
    )
    id1 = r1.json()["data"]["id"]
    id2 = r2.json()["data"]["id"]

    # Act
    response = await client.patch(
        "/api/applications/bulk-stage",
        json={"ids": [id1, id2], "stage": "Phone Screen"},
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 200
    assert response.json()["data"]["updated_count"] == 2
    detail = await client.get(f"/api/applications/{id1}", cookies=cookies)
    assert detail.json()["data"]["current_stage"] == "Phone Screen"


async def test_bulk_stage_update_appends_stage_history(client, test_user):
    # Arrange
    _, cookies = test_user
    r1 = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    app_id = r1.json()["data"]["id"]

    # Act
    await client.patch(
        "/api/applications/bulk-stage",
        json={"ids": [app_id], "stage": "Onsite"},
        cookies=cookies,
    )

    # Assert
    detail = await client.get(f"/api/applications/{app_id}", cookies=cookies)
    history = detail.json()["data"]["stage_history"]
    assert len(history) == 2
    assert history[-1]["stage"] == "Onsite"


async def test_bulk_stage_update_returns_422_on_empty_ids(client, test_user):
    # Arrange
    _, cookies = test_user

    # Act
    response = await client.patch(
        "/api/applications/bulk-stage",
        json={"ids": [], "stage": "Rejected"},
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 422


async def test_bulk_stage_update_only_updates_own_applications(client, test_user):
    # Arrange
    _, cookies = test_user
    resp_other = await client.post("/api/auth/register", json={
        "email": "bulkother2@example.com",
        "password": "OtherPass123!",
        "display_name": "Other User 2",
    })
    other_cookies = dict(resp_other.cookies)
    r_other = await client.post("/api/applications", json=APP_PAYLOAD, cookies=other_cookies)
    other_id = r_other.json()["data"]["id"]

    # Act — attempt to update another user's application stage
    response = await client.patch(
        "/api/applications/bulk-stage",
        json={"ids": [other_id], "stage": "Rejected"},
        cookies=cookies,
    )

    # Assert — updated_count is 0; other user's app is untouched
    assert response.status_code == 200
    assert response.json()["data"]["updated_count"] == 0
    verify = await client.get(f"/api/applications/{other_id}", cookies=other_cookies)
    assert verify.json()["data"]["current_stage"] == "Applied"


async def test_get_analytics_returns_expected_shape(client, test_user):
    # Arrange — use distinct role titles per company to avoid duplicate-application rejection
    _, cookies = test_user
    entries = [
        ("Alpha", "SWE I"),
        ("Beta", "SWE II"),
        ("Alpha", "SWE II"),
        ("Gamma", "SWE I"),
        ("Alpha", "SWE III"),
    ]
    for company, role in entries:
        await client.post(
            "/api/applications",
            json={**APP_PAYLOAD, "company": company, "role_title": role},
            cookies=cookies,
        )

    # Act
    response = await client.get("/api/applications/analytics", cookies=cookies)

    # Assert
    assert response.status_code == 200
    data = response.json()["data"]
    assert "applications_by_week" in data
    assert "stage_funnel" in data
    assert "response_rate_by_month" in data
    assert "top_companies" in data
    assert isinstance(data["applications_by_week"], list)
    assert isinstance(data["stage_funnel"], list)
    assert isinstance(data["response_rate_by_month"], list)
    assert isinstance(data["top_companies"], list)
    # top company should be Alpha with count 3
    top = data["top_companies"][0]
    assert top["company"] == "Alpha"
    assert top["count"] == 3


async def test_get_analytics_with_days_filter(client, test_user):
    # Arrange
    _, cookies = test_user
    await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)

    # Act
    response = await client.get("/api/applications/analytics?days=30", cookies=cookies)

    # Assert
    assert response.status_code == 200
    data = response.json()["data"]
    assert "applications_by_week" in data
    assert "stage_funnel" in data


async def test_get_analytics_rejects_invalid_days(client, test_user):
    # Arrange
    _, cookies = test_user

    # Act — negative days
    response_neg = await client.get("/api/applications/analytics?days=-1", cookies=cookies)
    # Act — zero days
    response_zero = await client.get("/api/applications/analytics?days=0", cookies=cookies)
    # Act — days exceeding max
    response_max = await client.get("/api/applications/analytics?days=999", cookies=cookies)

    # Assert
    assert response_neg.status_code == 422
    assert response_zero.status_code == 422
    assert response_max.status_code == 422


async def test_get_analytics_requires_auth(client):
    # Act
    response = await client.get("/api/applications/analytics")

    # Assert
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/applications/import
# ---------------------------------------------------------------------------

CSV_HEADER = "company,role_title,location\n"


async def test_import_csv_happy_path(client, test_user):
    # Arrange
    _, cookies = test_user
    csv_bytes = (CSV_HEADER + "Acme Corp,Software Engineer,NYC\nBeta Inc,PM,SF\n").encode()
    files = {"file": ("apps.csv", csv_bytes, "text/csv")}

    # Act
    response = await client.post("/api/applications/import", files=files, cookies=cookies)

    # Assert
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["imported"] == 2
    assert data["skipped"] == 0
    assert data["errors"] == []


async def test_import_csv_skips_missing_required_fields(client, test_user):
    # Arrange
    _, cookies = test_user
    csv_bytes = (CSV_HEADER + ",Software Engineer,NYC\nAcme Corp,,SF\n").encode()
    files = {"file": ("apps.csv", csv_bytes, "text/csv")}

    # Act
    response = await client.post("/api/applications/import", files=files, cookies=cookies)

    # Assert
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["imported"] == 0
    assert len(data["errors"]) == 2
    assert "Missing required field" in data["errors"][0]["reason"]


async def test_import_csv_skips_duplicates(client, test_user):
    # Arrange
    _, cookies = test_user
    await client.post(
        "/api/applications",
        json={"role_title": "Software Engineer", "company": "Acme Corp", "source": "manual"},
        cookies=cookies,
    )
    csv_bytes = (CSV_HEADER + "Acme Corp,Software Engineer,NYC\n").encode()
    files = {"file": ("apps.csv", csv_bytes, "text/csv")}

    # Act
    response = await client.post("/api/applications/import", files=files, cookies=cookies)

    # Assert
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["imported"] == 0
    assert data["skipped"] == 1


async def test_import_csv_truncates_at_row_cap(client, test_user):
    # Arrange
    _, cookies = test_user
    rows = "".join(f"Company{i},Role{i},NYC\n" for i in range(510))
    csv_bytes = (CSV_HEADER + rows).encode()
    files = {"file": ("apps.csv", csv_bytes, "text/csv")}

    # Act
    response = await client.post("/api/applications/import", files=files, cookies=cookies)

    # Assert
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["imported"] == 500
    assert data["warning"] is not None
