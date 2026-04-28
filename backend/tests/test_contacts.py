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
    await _create_contact(client, cookies, {"name": "Bob Mentor", "email": "bob@example.com", "relationship": "mentor"})

    # Act
    resp = await client.get("/api/contacts/", cookies=cookies)

    # Assert
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) == 2


async def test_list_contacts_filter_by_relationship(client, test_user):
    # Arrange
    _, cookies = test_user
    await _create_contact(client, cookies, {"name": "Alice", "email": "alice@example.com", "relationship": "recruiter"})
    await _create_contact(client, cookies, {"name": "Bob", "email": "bob@example.com", "relationship": "mentor"})

    # Act
    resp = await client.get("/api/contacts/?relationship=recruiter", cookies=cookies)

    # Assert
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert all(c["relationship"] == "recruiter" for c in data)


async def test_list_contacts_filter_by_company(client, test_user):
    # Arrange
    _, cookies = test_user
    await _create_contact(client, cookies, {"name": "Carol", "email": "carol@example.com", "company": "TechCo"})
    await _create_contact(client, cookies, {"name": "Dave", "email": "dave@example.com", "company": "OtherCo"})

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
    await _create_contact(client, cookies, {"name": "Unlinked Contact", "email": "unlinked@example.com"})

    # Act
    resp = await client.get(f"/api/contacts/?application_id={app_id}", cookies=cookies)

    # Assert
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) == 1
    assert data[0]["id"] == contact_id


# ---------------------------------------------------------------------------
# Validation edge cases
# ---------------------------------------------------------------------------


async def test_create_contact_rejects_invalid_email(client, test_user):
    # Arrange
    _, cookies = test_user

    # Act
    resp = await client.post("/api/contacts/", json={"name": "Test", "email": "not-an-email"}, cookies=cookies)

    # Assert
    assert resp.status_code == 422


async def test_create_contact_rejects_long_name(client, test_user):
    # Arrange
    _, cookies = test_user
    long_name = "a" * 201

    # Act
    resp = await client.post("/api/contacts/", json={"name": long_name}, cookies=cookies)

    # Assert
    assert resp.status_code == 422


async def test_create_contact_rejects_duplicate_email(client, test_user):
    # Arrange
    _, cookies = test_user
    await _create_contact(client, cookies, {"name": "First Contact", "email": "dup@example.com"})

    # Act
    resp = await client.post(
        "/api/contacts/",
        json={"name": "Second Contact", "email": "dup@example.com"},
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 409
    assert resp.json()["detail"]["code"] == "DUPLICATE_CONTACT"


async def test_create_contact_without_email_allows_duplicate_names(client, test_user):
    # Arrange: contacts without email should not trigger duplicate check
    _, cookies = test_user

    # Act
    resp1 = await client.post("/api/contacts/", json={"name": "No Email One"}, cookies=cookies)
    resp2 = await client.post("/api/contacts/", json={"name": "No Email Two"}, cookies=cookies)

    # Assert
    assert resp1.status_code == 201
    assert resp2.status_code == 201


async def test_create_contact_rejects_duplicate_email_case_insensitive(client, test_user):
    # Arrange
    _, cookies = test_user
    await _create_contact(client, cookies, {"name": "Case Test One", "email": "casedupe@example.com"})

    # Act — same email in different case
    resp = await client.post(
        "/api/contacts/",
        json={"name": "Case Test Two", "email": "CASEDUPE@EXAMPLE.COM"},
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 409
    assert resp.json()["detail"]["code"] == "DUPLICATE_CONTACT"


async def test_update_contact_rejects_duplicate_email(client, test_user):
    # Arrange: two contacts with distinct emails
    _, cookies = test_user
    await _create_contact(client, cookies, {"name": "Alpha", "email": "alpha@example.com"})
    beta = (await _create_contact(client, cookies, {"name": "Beta", "email": "beta@example.com"}))["data"]

    # Act: try to change Beta's email to Alpha's
    resp = await client.patch(
        f"/api/contacts/{beta['id']}",
        json={"email": "alpha@example.com"},
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 409
    assert resp.json()["detail"]["code"] == "DUPLICATE_CONTACT"


# ---------------------------------------------------------------------------
# GET /api/contacts/suggest-type
# ---------------------------------------------------------------------------


async def test_suggest_type_returns_recruiter_when_company_appears_5_or_more_times(client, test_user):
    # Arrange: create 5 applications at the same company under different roles
    _, cookies = test_user
    roles = ["Engineer I", "Engineer II", "Engineer III", "Engineer IV", "Engineer V"]
    app_ids = []
    for role in roles:
        resp = await client.post(
            "/api/applications",
            json={"role_title": role, "company": "BigCo", "source": "manual"},
            cookies=cookies,
        )
        app_ids.append(resp.json()["data"]["id"])

    # Act
    resp = await client.get(
        f"/api/contacts/suggest-type?application_id={app_ids[-1]}",
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["suggested_type"] == "recruiter"
    assert data["confidence"] >= 0.7
    assert "BigCo" in data["reason"]


async def test_suggest_type_returns_hiring_manager_for_single_application(client, test_user):
    # Arrange
    _, cookies = test_user
    resp = await client.post(
        "/api/applications",
        json={"role_title": "Unique Role XYZ", "company": "Solo Corp", "source": "manual"},
        cookies=cookies,
    )
    app_id = resp.json()["data"]["id"]

    # Act
    resp = await client.get(
        f"/api/contacts/suggest-type?application_id={app_id}",
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["suggested_type"] == "hiring_manager"
    assert data["confidence"] > 0.5


async def test_suggest_type_uses_email_domain_for_recruiter_detection(client, test_user):
    # Arrange: create 5 apps with source_url from techcorp.com → company_domain = techcorp.com
    _, cookies = test_user
    for i in range(5):
        await client.post(
            "/api/applications",
            json={
                "role_title": f"TechCorp Role {i}",
                "company": f"TechCorp {i}",
                "source": "manual",
                "source_url": f"https://techcorp.com/jobs/{i}",
            },
            cookies=cookies,
        )

    # Act: suggest via email only
    resp = await client.get(
        "/api/contacts/suggest-type?email=recruiter@techcorp.com",
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["suggested_type"] == "recruiter"
    assert data["confidence"] >= 0.7
    assert "techcorp.com" in data["reason"]


async def test_suggest_type_returns_other_when_no_matching_history(client, test_user):
    # Arrange: no applications, unknown email domain
    _, cookies = test_user

    # Act
    resp = await client.get(
        "/api/contacts/suggest-type?email=unknown@unrecognized-domain-xyz.com",
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["suggested_type"] == "other"
    assert data["confidence"] <= 0.5


async def test_suggest_type_requires_auth(client):
    # Act
    resp = await client.get("/api/contacts/suggest-type?email=test@example.com")

    # Assert
    assert resp.status_code == 401


async def test_contact_isolation_across_users(client, test_user, other_user):
    # Arrange: user 1 creates a contact
    _, cookies1 = test_user
    _, cookies2 = other_user
    created = (await _create_contact(client, cookies1, {"name": "Private", "email": "private@example.com"}))["data"]
    contact_id = created["id"]

    # Act: user 2 tries to access it
    resp = await client.get(f"/api/contacts/{contact_id}", cookies=cookies2)

    # Assert: should be invisible to other user
    assert resp.status_code == 404
