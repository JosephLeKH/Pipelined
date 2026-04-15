"""Integration tests for application templates router endpoints."""

import pytest

pytestmark = pytest.mark.asyncio(loop_scope="session")

TEMPLATE_PAYLOAD = {
    "name": "Remote SWE",
    "fields": {
        "company_type": "startup",
        "remote_status": "remote",
        "role_type": "full_time",
        "source": "linkedin",
        "tags": ["python", "remote"],
        "compensation": "$150k",
    },
}


async def _create_template(client, cookies: dict, overrides: dict | None = None) -> dict:
    payload = {**TEMPLATE_PAYLOAD, **(overrides or {})}
    resp = await client.post("/api/templates/", json=payload, cookies=cookies)
    return resp.json()


# ---------------------------------------------------------------------------
# POST /api/templates/
# ---------------------------------------------------------------------------


async def test_create_template_returns_201(client, test_user):
    # Arrange
    _, cookies = test_user

    # Act
    resp = await client.post("/api/templates/", json=TEMPLATE_PAYLOAD, cookies=cookies)

    # Assert
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["name"] == "Remote SWE"
    assert data["fields"]["remote_status"] == "remote"
    assert data["fields"]["tags"] == ["python", "remote"]
    assert "id" in data
    assert "created_at" in data


async def test_create_template_requires_auth(client):
    # Act
    resp = await client.post("/api/templates/", json=TEMPLATE_PAYLOAD)

    # Assert
    assert resp.status_code == 401


async def test_create_template_enforces_limit(client, test_user):
    # Arrange — fill up to MAX (10)
    _, cookies = test_user
    for i in range(10):
        r = await client.post(
            "/api/templates/",
            json={"name": f"Template {i}", "fields": {}},
            cookies=cookies,
        )
        assert r.status_code == 201

    # Act — one more should fail
    resp = await client.post(
        "/api/templates/",
        json={"name": "Over limit", "fields": {}},
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 400
    assert resp.json()["detail"]["code"] == "TEMPLATE_LIMIT_EXCEEDED"


# ---------------------------------------------------------------------------
# GET /api/templates/
# ---------------------------------------------------------------------------


async def test_list_templates_returns_user_templates(client, test_user):
    # Arrange
    _, cookies = test_user
    await _create_template(client, cookies)
    await _create_template(client, cookies, overrides={"name": "Onsite Only"})

    # Act
    resp = await client.get("/api/templates/", cookies=cookies)

    # Assert
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) == 2
    names = {t["name"] for t in data}
    assert "Remote SWE" in names
    assert "Onsite Only" in names


async def test_list_templates_requires_auth(client):
    # Act
    resp = await client.get("/api/templates/")

    # Assert
    assert resp.status_code == 401


async def test_list_templates_scoped_to_user(client, test_user):
    # Arrange — create for test_user
    _, cookies = test_user
    await _create_template(client, cookies)

    # Register a second user
    second_resp = await client.post("/api/auth/register", json={
        "email": "second_tmpl@example.com",
        "password": "TestPass123!",
        "display_name": "Second User",
    })
    second_cookies = dict(second_resp.cookies)
    import database
    if database.db is not None:
        second_id = second_resp.json()["data"]["id"]
        from bson import ObjectId
        await database.db["users"].update_one(
            {"_id": ObjectId(second_id)}, {"$set": {"email_verified": True}}
        )

    # Act — second user lists templates
    resp = await client.get("/api/templates/", cookies=second_cookies)

    # Assert — sees none of test_user's templates
    assert resp.status_code == 200
    assert resp.json()["data"] == []


# ---------------------------------------------------------------------------
# PATCH /api/templates/{id}
# ---------------------------------------------------------------------------


async def test_update_template_renames(client, test_user):
    # Arrange
    _, cookies = test_user
    created = (await _create_template(client, cookies))["data"]

    # Act
    resp = await client.patch(
        f"/api/templates/{created['id']}",
        json={"name": "Renamed Template"},
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 200
    assert resp.json()["data"]["name"] == "Renamed Template"


async def test_update_template_updates_fields(client, test_user):
    # Arrange
    _, cookies = test_user
    created = (await _create_template(client, cookies))["data"]

    # Act
    resp = await client.patch(
        f"/api/templates/{created['id']}",
        json={"fields": {"remote_status": "hybrid", "tags": ["java"]}},
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 200
    fields = resp.json()["data"]["fields"]
    assert fields["remote_status"] == "hybrid"
    assert fields["tags"] == ["java"]


async def test_update_template_returns_404_for_unknown(client, test_user):
    # Arrange
    _, cookies = test_user

    # Act
    resp = await client.patch(
        "/api/templates/000000000000000000000001",
        json={"name": "Ghost"},
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /api/templates/{id}
# ---------------------------------------------------------------------------


async def test_delete_template_returns_204(client, test_user):
    # Arrange
    _, cookies = test_user
    created = (await _create_template(client, cookies))["data"]

    # Act
    resp = await client.delete(f"/api/templates/{created['id']}", cookies=cookies)

    # Assert
    assert resp.status_code == 204


async def test_delete_template_removes_from_list(client, test_user):
    # Arrange
    _, cookies = test_user
    created = (await _create_template(client, cookies))["data"]
    await client.delete(f"/api/templates/{created['id']}", cookies=cookies)

    # Act
    resp = await client.get("/api/templates/", cookies=cookies)

    # Assert
    ids = [t["id"] for t in resp.json()["data"]]
    assert created["id"] not in ids


async def test_delete_template_returns_404_for_unknown(client, test_user):
    # Arrange
    _, cookies = test_user

    # Act
    resp = await client.delete("/api/templates/000000000000000000000001", cookies=cookies)

    # Assert
    assert resp.status_code == 404


async def test_every_query_includes_user_id_filter(client, test_user):
    """Verify user isolation: one user cannot touch another's templates."""
    # Arrange — create template as test_user
    _, cookies = test_user
    created = (await _create_template(client, cookies))["data"]

    # Register a second user
    second_resp = await client.post("/api/auth/register", json={
        "email": "isolation_tmpl@example.com",
        "password": "TestPass123!",
        "display_name": "Isolation User",
    })
    second_cookies = dict(second_resp.cookies)
    import database
    if database.db is not None:
        second_id = second_resp.json()["data"]["id"]
        from bson import ObjectId
        await database.db["users"].update_one(
            {"_id": ObjectId(second_id)}, {"$set": {"email_verified": True}}
        )

    # Act — second user tries to delete test_user's template
    del_resp = await client.delete(f"/api/templates/{created['id']}", cookies=second_cookies)

    # Assert — 404, not 204
    assert del_resp.status_code == 404
