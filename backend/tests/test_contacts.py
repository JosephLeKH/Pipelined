"""Integration tests for contacts router endpoints."""

import pytest

pytestmark = pytest.mark.asyncio(loop_scope="session")

APP_PAYLOAD = {
    "role_title": "Software Engineer",
    "company": "Acme Corp",
    "source": "manual",
}

CONTACT_PAYLOAD = {
    "name": "Jane Recruiter",
    "company": "Acme Corp",
    "role": "Technical Recruiter",
    "email": "jane@acme.com",
    "relationship": "recruiter",
}


async def _create_app(client, cookies: dict) -> str:
    resp = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    return resp.json()["data"]["id"]


async def _create_contact(client, cookies: dict, overrides: dict | None = None) -> dict:
    payload = {**CONTACT_PAYLOAD, **(overrides or {})}
    resp = await client.post("/api/contacts/", json=payload, cookies=cookies)
    return resp.json()


# ---------------------------------------------------------------------------
# POST /api/contacts/
# ---------------------------------------------------------------------------


async def test_create_contact_returns_201(client, test_user):
    # Arrange
    _, cookies = test_user

    # Act
    resp = await client.post("/api/contacts/", json=CONTACT_PAYLOAD, cookies=cookies)

    # Assert
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["name"] == "Jane Recruiter"
    assert data["company"] == "Acme Corp"
    assert data["relationship"] == "recruiter"
    assert data["linked_application_ids"] == []


async def test_create_contact_requires_name(client, test_user):
    # Arrange
    _, cookies = test_user

    # Act
    resp = await client.post("/api/contacts/", json={"relationship": "other"}, cookies=cookies)

    # Assert
    assert resp.status_code == 422


async def test_create_contact_requires_auth(client):
    # Act
    resp = await client.post("/api/contacts/", json=CONTACT_PAYLOAD)

    # Assert
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/contacts/
# ---------------------------------------------------------------------------


async def test_list_contacts_returns_all(client, test_user):
    # Arrange
    _, cookies = test_user
    await _create_contact(client, cookies)
    await _create_contact(client, cookies, {"name": "Bob Mentor", "relationship": "mentor"})

    # Act
    resp = await client.get("/api/contacts/", cookies=cookies)

    # Assert
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) == 2


async def test_list_contacts_filter_by_relationship(client, test_user):
    # Arrange
    _, cookies = test_user
    await _create_contact(client, cookies, {"name": "Alice", "relationship": "recruiter"})
    await _create_contact(client, cookies, {"name": "Bob", "relationship": "mentor"})

    # Act
    resp = await client.get("/api/contacts/?relationship=recruiter", cookies=cookies)

    # Assert
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert all(c["relationship"] == "recruiter" for c in data)


async def test_list_contacts_filter_by_company(client, test_user):
    # Arrange
    _, cookies = test_user
    await _create_contact(client, cookies, {"name": "Carol", "company": "TechCo"})
    await _create_contact(client, cookies, {"name": "Dave", "company": "OtherCo"})

    # Act
    resp = await client.get("/api/contacts/?company=TechCo", cookies=cookies)

    # Assert
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert all("TechCo" in c["company"] for c in data)


# ---------------------------------------------------------------------------
# GET /api/contacts/{contact_id}
# ---------------------------------------------------------------------------


async def test_get_contact_returns_doc(client, test_user):
    # Arrange
    _, cookies = test_user
    created = (await _create_contact(client, cookies))["data"]
    contact_id = created["id"]

    # Act
    resp = await client.get(f"/api/contacts/{contact_id}", cookies=cookies)

    # Assert
    assert resp.status_code == 200
    assert resp.json()["data"]["id"] == contact_id


async def test_get_contact_not_found(client, test_user):
    # Arrange
    _, cookies = test_user

    # Act
    resp = await client.get("/api/contacts/000000000000000000000000", cookies=cookies)

    # Assert
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PATCH /api/contacts/{contact_id}
# ---------------------------------------------------------------------------


async def test_update_contact_partial(client, test_user):
    # Arrange
    _, cookies = test_user
    created = (await _create_contact(client, cookies))["data"]
    contact_id = created["id"]

    # Act
    resp = await client.patch(
        f"/api/contacts/{contact_id}",
        json={"role": "Senior Recruiter"},
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 200
    assert resp.json()["data"]["role"] == "Senior Recruiter"


# ---------------------------------------------------------------------------
# DELETE /api/contacts/{contact_id}
# ---------------------------------------------------------------------------


async def test_delete_contact_returns_204(client, test_user):
    # Arrange
    _, cookies = test_user
    created = (await _create_contact(client, cookies))["data"]
    contact_id = created["id"]

    # Act
    resp = await client.delete(f"/api/contacts/{contact_id}", cookies=cookies)

    # Assert
    assert resp.status_code == 204


async def test_delete_contact_not_found(client, test_user):
    # Arrange
    _, cookies = test_user

    # Act
    resp = await client.delete("/api/contacts/000000000000000000000000", cookies=cookies)

    # Assert
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PATCH /api/contacts/{contact_id}/link
# ---------------------------------------------------------------------------


async def test_link_application_adds_id(client, test_user):
    # Arrange
    _, cookies = test_user
    app_id = await _create_app(client, cookies)
    created = (await _create_contact(client, cookies))["data"]
    contact_id = created["id"]

    # Act
    resp = await client.patch(
        f"/api/contacts/{contact_id}/link",
        json={"application_id": app_id},
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 200
    assert app_id in resp.json()["data"]["linked_application_ids"]


async def test_link_application_idempotent(client, test_user):
    # Arrange
    _, cookies = test_user
    app_id = await _create_app(client, cookies)
    created = (await _create_contact(client, cookies))["data"]
    contact_id = created["id"]
    await client.patch(
        f"/api/contacts/{contact_id}/link",
        json={"application_id": app_id},
        cookies=cookies,
    )

    # Act: link again
    resp = await client.patch(
        f"/api/contacts/{contact_id}/link",
        json={"application_id": app_id},
        cookies=cookies,
    )

    # Assert: still present, not duplicated
    assert resp.status_code == 200
    ids = resp.json()["data"]["linked_application_ids"]
    assert ids.count(app_id) == 1


async def test_link_application_not_found(client, test_user):
    # Arrange
    _, cookies = test_user
    created = (await _create_contact(client, cookies))["data"]
    contact_id = created["id"]

    # Act
    resp = await client.patch(
        f"/api/contacts/{contact_id}/link",
        json={"application_id": "000000000000000000000000"},
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PATCH /api/contacts/{contact_id}/unlink
# ---------------------------------------------------------------------------


async def test_unlink_application_removes_id(client, test_user):
    # Arrange
    _, cookies = test_user
    app_id = await _create_app(client, cookies)
    created = (await _create_contact(client, cookies))["data"]
    contact_id = created["id"]
    await client.patch(
        f"/api/contacts/{contact_id}/link",
        json={"application_id": app_id},
        cookies=cookies,
    )

    # Act
    resp = await client.patch(
        f"/api/contacts/{contact_id}/unlink",
        json={"application_id": app_id},
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 200
    assert app_id not in resp.json()["data"]["linked_application_ids"]


# ---------------------------------------------------------------------------
# PATCH /api/contacts/{contact_id}/ping
# ---------------------------------------------------------------------------


async def test_ping_contact_updates_last_contacted_at(client, test_user):
    # Arrange
    _, cookies = test_user
    created = (await _create_contact(client, cookies))["data"]
    contact_id = created["id"]

    # Act
    resp = await client.patch(f"/api/contacts/{contact_id}/ping", cookies=cookies)

    # Assert
    assert resp.status_code == 200
    assert resp.json()["data"]["last_contacted_at"] is not None


async def test_list_contacts_filter_by_application_id(client, test_user):
    # Arrange
    _, cookies = test_user
    app_id = await _create_app(client, cookies)
    created = (await _create_contact(client, cookies))["data"]
    contact_id = created["id"]
    await client.patch(
        f"/api/contacts/{contact_id}/link",
        json={"application_id": app_id},
        cookies=cookies,
    )
    await _create_contact(client, cookies, {"name": "Unlinked Contact"})

    # Act
    resp = await client.get(f"/api/contacts/?application_id={app_id}", cookies=cookies)

    # Assert
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) == 1
    assert data[0]["id"] == contact_id
