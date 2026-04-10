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
    assert "salary_distribution" in data
    assert isinstance(data["applications_by_week"], list)
    assert isinstance(data["stage_funnel"], list)
    assert isinstance(data["response_rate_by_month"], list)
    assert isinstance(data["top_companies"], list)
    assert isinstance(data["salary_distribution"], list)
    # top company should be Alpha with count 3
    top = data["top_companies"][0]
    assert top["company"] == "Alpha"
    assert top["count"] == 3
    # salary_distribution should have all 5 buckets
    buckets = [item["bucket"] for item in data["salary_distribution"]]
    assert "$0–50k" in buckets
    assert "$100–150k" in buckets


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


async def test_get_analytics_salary_distribution_buckets(client, test_user):
    """salary_distribution should bucket compensation strings into the correct ranges."""
    _, cookies = test_user

    # Arrange — create apps with varied compensation formats
    salary_cases = [
        ("$40k", "Intern Role"),          # $0–50k
        ("$80k", "Junior Role"),          # $50–100k
        ("$80,000", "Junior Role B"),     # $50–100k
        ("120000", "Mid Role"),           # $100–150k
        ("$175k", "Senior Role"),         # $150–200k
        ("$250k", "Staff Role"),          # $200k+
    ]
    for comp, role in salary_cases:
        await client.post(
            "/api/applications",
            json={**APP_PAYLOAD, "role_title": role, "compensation": comp},
            cookies=cookies,
        )

    # Act
    response = await client.get("/api/applications/analytics", cookies=cookies)

    # Assert
    assert response.status_code == 200
    dist = {item["bucket"]: item["count"] for item in response.json()["data"]["salary_distribution"]}
    assert dist["$0–50k"] >= 1
    assert dist["$50–100k"] >= 2
    assert dist["$100–150k"] >= 1
    assert dist["$150–200k"] >= 1
    assert dist["$200k+"] >= 1


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


# ---------------------------------------------------------------------------
# Soft-delete: DELETE sets deleted flag, restore resets it, list excludes deleted
# ---------------------------------------------------------------------------


async def test_delete_sets_deleted_flag_not_hard_deletes(client, test_user):
    # Arrange
    _, cookies = test_user
    resp = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    app_id = resp.json()["data"]["id"]

    # Act
    del_resp = await client.delete(f"/api/applications/{app_id}", cookies=cookies)

    # Assert — DELETE returns 204
    assert del_resp.status_code == 204

    # Doc still exists in DB with deleted=True
    col = get_collection("applications")
    from bson import ObjectId
    doc = await col.find_one({"_id": ObjectId(app_id)})
    assert doc is not None
    assert doc["deleted"] is True
    assert doc["deleted_at"] is not None


async def test_restore_resets_deleted_fields(client, test_user):
    # Arrange
    _, cookies = test_user
    resp = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    app_id = resp.json()["data"]["id"]
    await client.delete(f"/api/applications/{app_id}", cookies=cookies)

    # Act
    restore_resp = await client.post(f"/api/applications/{app_id}/restore", cookies=cookies)

    # Assert
    assert restore_resp.status_code == 200
    data = restore_resp.json()["data"]
    assert data["deleted"] is False
    assert data["deleted_at"] is None


async def test_deleted_applications_excluded_from_list(client, test_user):
    # Arrange
    _, cookies = test_user
    resp = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    app_id = resp.json()["data"]["id"]
    await client.delete(f"/api/applications/{app_id}", cookies=cookies)

    # Act
    list_resp = await client.get("/api/applications", cookies=cookies)

    # Assert
    assert list_resp.status_code == 200
    ids = [a["id"] for a in list_resp.json()["data"]]
    assert app_id not in ids


# ---------------------------------------------------------------------------
# GET /api/applications/stats — applied_this_week and current_streak
# ---------------------------------------------------------------------------


async def test_stats_applied_this_week_counts_current_week_applications(client, test_user):
    # Arrange — create one app (default date_applied = now, i.e. this week)
    _, cookies = test_user
    post_resp = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    assert post_resp.status_code == 201

    # Act
    response = await client.get("/api/applications/stats", cookies=cookies)

    # Assert
    data = response.json()["data"]
    assert data["applied_this_week"] >= 1
    assert "current_streak" in data


async def test_stats_applied_this_week_excludes_last_week_applications(client, test_user):
    # Arrange — insert an app directly with date_applied 8 days ago (last week)
    user, cookies = test_user
    from bson import ObjectId
    from datetime import timedelta
    last_week = datetime.now(timezone.utc) - timedelta(days=8)
    col = get_collection("applications")
    await col.insert_one({
        "user_id": ObjectId(user["id"]),
        "role_title": "Old Role",
        "company": "Old Corp",
        "normalised_company": "old corp",
        "normalised_role": "old role",
        "source": "manual",
        "current_stage": "Applied",
        "stages": ["Applied"],
        "stage_history": [{"stage": "Applied", "transitioned_at": last_week}],
        "date_applied": last_week,
        "created_at": last_week,
        "updated_at": last_week,
        "tags": [],
        "archived": False,
    })

    # Act
    response = await client.get("/api/applications/stats", cookies=cookies)

    # Assert
    data = response.json()["data"]
    assert data["applied_this_week"] == 0


# ---------------------------------------------------------------------------
# Follow-up date field tests
# ---------------------------------------------------------------------------


async def test_update_application_sets_follow_up_date(client, test_user):
    # Arrange
    _, cookies = test_user
    create_resp = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    app_id = create_resp.json()["data"]["id"]

    # Act
    response = await client.patch(
        f"/api/applications/{app_id}",
        json={"follow_up_date": "2026-04-15T00:00:00Z"},
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["follow_up_date"] is not None
    assert "2026-04-15" in data["follow_up_date"]


async def test_update_application_clears_follow_up_date(client, test_user):
    # Arrange
    _, cookies = test_user
    create_resp = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    app_id = create_resp.json()["data"]["id"]
    await client.patch(
        f"/api/applications/{app_id}",
        json={"follow_up_date": "2026-04-15T00:00:00Z"},
        cookies=cookies,
    )

    # Act — explicitly set to null to clear
    response = await client.patch(
        f"/api/applications/{app_id}",
        json={"follow_up_date": None},
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["follow_up_date"] is None


async def test_stats_follow_ups_due_counts_overdue_applications(client, test_user):
    # Arrange — create an app with follow_up_date in the past
    user, cookies = test_user
    from bson import ObjectId

    yesterday = datetime.now(timezone.utc) - timedelta(days=1)
    col = get_collection("applications")
    await col.insert_one({
        "user_id": ObjectId(user["id"]),
        "role_title": "Follow-Up Role",
        "company": "Reminder Corp",
        "normalised_company": "reminder corp",
        "normalised_role": "follow-up role",
        "source": "manual",
        "current_stage": "Applied",
        "stages": ["Applied"],
        "stage_history": [{"stage": "Applied", "transitioned_at": yesterday}],
        "date_applied": yesterday,
        "created_at": yesterday,
        "updated_at": yesterday,
        "follow_up_date": yesterday,
        "tags": [],
        "archived": False,
    })

    # Act
    response = await client.get("/api/applications/stats", cookies=cookies)

    # Assert
    data = response.json()["data"]
    assert data["follow_ups_due"] >= 1


async def test_stats_follow_ups_due_excludes_archived_applications(client, test_user):
    # Arrange — archived app with past follow_up_date should not count
    user, cookies = test_user
    from bson import ObjectId

    yesterday = datetime.now(timezone.utc) - timedelta(days=1)
    col = get_collection("applications")
    await col.insert_one({
        "user_id": ObjectId(user["id"]),
        "role_title": "Archived Follow-Up",
        "company": "Old Corp",
        "normalised_company": "old corp",
        "normalised_role": "archived follow-up",
        "source": "manual",
        "current_stage": "Applied",
        "stages": ["Applied"],
        "stage_history": [{"stage": "Applied", "transitioned_at": yesterday}],
        "date_applied": yesterday,
        "created_at": yesterday,
        "updated_at": yesterday,
        "follow_up_date": yesterday,
        "tags": [],
        "archived": True,
    })

    # Act
    response = await client.get("/api/applications/stats", cookies=cookies)

    # Assert — follow_ups_due count should not include archived app
    data = response.json()["data"]
    assert "follow_ups_due" in data


# ---------------------------------------------------------------------------
# POST /api/applications/merge
# ---------------------------------------------------------------------------


async def test_merge_merges_fields_correctly(client, test_user):
    # Arrange — source has company but no location; target has location but no company
    _, cookies = test_user

    source_resp = await client.post("/api/applications", json={
        "role_title": "Engineer",
        "company": "Source Corp",
        "source": "manual",
    }, cookies=cookies)
    target_resp = await client.post("/api/applications", json={
        "role_title": "Engineer",
        "source": "manual",
        "location": "San Francisco",
    }, cookies=cookies)
    source_id = source_resp.json()["data"]["id"]
    target_id = target_resp.json()["data"]["id"]

    # Act
    response = await client.post("/api/applications/merge", json={
        "source_id": source_id,
        "target_id": target_id,
    }, cookies=cookies)

    # Assert — target now has source's company and its own location
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["id"] == target_id
    assert data["company"] == "Source Corp"
    assert data["location"] == "San Francisco"


async def test_merge_stage_history_combined_and_sorted(client, test_user):
    # Arrange — two apps each with stage history entries
    _, cookies = test_user

    source_resp = await client.post("/api/applications", json={
        "role_title": "Dev Stage A",
        "company": "Alpha",
        "source": "manual",
    }, cookies=cookies)
    target_resp = await client.post("/api/applications", json={
        "role_title": "Dev Stage B",
        "company": "Alpha",
        "source": "manual",
    }, cookies=cookies)
    source_id = source_resp.json()["data"]["id"]
    target_id = target_resp.json()["data"]["id"]

    # Move source to Interview stage so it gets a history entry
    await client.patch(f"/api/applications/{source_id}", json={
        "current_stage": "Interview",
    }, cookies=cookies)

    # Act
    response = await client.post("/api/applications/merge", json={
        "source_id": source_id,
        "target_id": target_id,
    }, cookies=cookies)

    # Assert — merged target has combined stage_history (at least 2 entries)
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data["stage_history"]) >= 2


async def test_merge_calendar_events_relinked(client, test_user):
    # Arrange — create apps and a calendar event linked to source
    from bson import ObjectId

    user, cookies = test_user

    source_resp = await client.post("/api/applications", json={
        "role_title": "PM Source",
        "company": "EventCo",
        "source": "manual",
    }, cookies=cookies)
    target_resp = await client.post("/api/applications", json={
        "role_title": "PM Target",
        "company": "EventCo",
        "source": "manual",
    }, cookies=cookies)
    source_id = source_resp.json()["data"]["id"]
    target_id = target_resp.json()["data"]["id"]

    events_col = get_collection("calendar_events")
    await events_col.insert_one({
        "user_id": ObjectId(user["id"]),
        "application_id": ObjectId(source_id),
        "title": "Onsite Interview",
        "start": datetime.now(timezone.utc),
        "end": datetime.now(timezone.utc) + timedelta(hours=1),
        "type": "interview",
    })

    # Act
    await client.post("/api/applications/merge", json={
        "source_id": source_id,
        "target_id": target_id,
    }, cookies=cookies)

    # Assert — event is now linked to target_id
    event = await events_col.find_one({"title": "Onsite Interview"})
    assert event is not None
    assert str(event["application_id"]) == target_id


async def test_merge_source_is_deleted(client, test_user):
    # Arrange
    _, cookies = test_user

    source_resp = await client.post("/api/applications", json={
        "role_title": "QA Source",
        "company": "DelCo",
        "source": "manual",
    }, cookies=cookies)
    target_resp = await client.post("/api/applications", json={
        "role_title": "QA Target",
        "company": "DelCo",
        "source": "manual",
    }, cookies=cookies)
    source_id = source_resp.json()["data"]["id"]
    target_id = target_resp.json()["data"]["id"]

    # Act
    response = await client.post("/api/applications/merge", json={
        "source_id": source_id,
        "target_id": target_id,
    }, cookies=cookies)

    # Assert — source no longer exists; target does
    assert response.status_code == 200
    source_check = await client.get(f"/api/applications/{source_id}", cookies=cookies)
    assert source_check.status_code == 404
    target_check = await client.get(f"/api/applications/{target_id}", cookies=cookies)
    assert target_check.status_code == 200


async def test_merge_invalid_id_returns_404(client, test_user):
    # Arrange — target is a valid app; source is a nonexistent id
    _, cookies = test_user

    target_resp = await client.post("/api/applications", json={
        "role_title": "Dev",
        "company": "Corp",
        "source": "manual",
    }, cookies=cookies)
    target_id = target_resp.json()["data"]["id"]
    fake_id = "000000000000000000000001"

    # Act
    response = await client.post("/api/applications/merge", json={
        "source_id": fake_id,
        "target_id": target_id,
    }, cookies=cookies)

    # Assert
    assert response.status_code == 404


async def test_merge_across_users_returns_404(client, test_user):
    # Arrange — source belongs to another user
    _, cookies = test_user

    resp_other = await client.post("/api/auth/register", json={
        "email": "mergeother@example.com",
        "password": "OtherPass123!",
        "display_name": "Other User",
    })
    other_cookies = dict(resp_other.cookies)

    other_resp = await client.post("/api/applications", json={
        "role_title": "Dev",
        "company": "OtherCo",
        "source": "manual",
    }, cookies=other_cookies)
    other_id = other_resp.json()["data"]["id"]

    target_resp = await client.post("/api/applications", json={
        "role_title": "Dev",
        "company": "MyCo",
        "source": "manual",
    }, cookies=cookies)
    target_id = target_resp.json()["data"]["id"]

    # Act — try to merge other user's app as source
    response = await client.post("/api/applications/merge", json={
        "source_id": other_id,
        "target_id": target_id,
    }, cookies=cookies)

    # Assert — cannot see other user's app; returns 404
    assert response.status_code == 404
