"""Tests for the sharing endpoints: create, get, revoke, and public pipeline."""

import pytest
import pytest_asyncio

from tests.conftest import verify_user_by_id


@pytest_asyncio.fixture(loop_scope="session")
async def test_user(client):
    """Register a user and return (user_doc, cookies)."""
    response = await client.post("/api/auth/register", json={
        "email": "share_test@example.com",
        "password": "TestPass123!",
        "display_name": "Share Tester",
    })
    user = response.json()["data"]
    cookies = dict(response.cookies)
    await verify_user_by_id(user["id"])
    return user, cookies


@pytest.mark.asyncio(loop_scope="session")
async def test_create_share_returns_slug(client, test_user):
    """Creating a share returns a slug, created_at, expires_at, and is_active=True."""
    _, cookies = test_user

    response = await client.post("/api/sharing/create", cookies=cookies)

    assert response.status_code == 201
    data = response.json()["data"]
    assert len(data["slug"]) == 16
    assert data["is_active"] is True
    assert "created_at" in data
    assert "expires_at" in data


@pytest.mark.asyncio(loop_scope="session")
async def test_get_my_share_returns_active_share(client, test_user):
    """After creating a share, GET /api/sharing/my returns it."""
    _, cookies = test_user

    await client.post("/api/sharing/create", cookies=cookies)
    response = await client.get("/api/sharing/my", cookies=cookies)

    assert response.status_code == 200
    data = response.json()["data"]
    assert data is not None
    assert data["is_active"] is True
    assert len(data["slug"]) == 16


@pytest.mark.asyncio(loop_scope="session")
async def test_get_my_share_returns_null_when_none(client, test_user):
    """Before creating any share, GET /api/sharing/my returns null."""
    _, cookies = test_user

    response = await client.get("/api/sharing/my", cookies=cookies)

    assert response.status_code == 200
    assert response.json()["data"] is None


@pytest.mark.asyncio(loop_scope="session")
async def test_create_share_deactivates_previous(client, test_user):
    """Creating a second share deactivates the first one."""
    _, cookies = test_user

    r1 = await client.post("/api/sharing/create", cookies=cookies)
    slug1 = r1.json()["data"]["slug"]

    r2 = await client.post("/api/sharing/create", cookies=cookies)
    slug2 = r2.json()["data"]["slug"]

    assert slug1 != slug2

    # Old slug should 404
    pub = await client.get(f"/api/public/{slug1}")
    assert pub.status_code == 404


@pytest.mark.asyncio(loop_scope="session")
async def test_revoke_share(client, test_user):
    """After revoking, the share is no longer accessible."""
    _, cookies = test_user

    create_resp = await client.post("/api/sharing/create", cookies=cookies)
    slug = create_resp.json()["data"]["slug"]

    revoke_resp = await client.delete("/api/sharing/revoke", cookies=cookies)
    assert revoke_resp.status_code == 204

    pub = await client.get(f"/api/public/{slug}")
    assert pub.status_code == 404


@pytest.mark.asyncio(loop_scope="session")
async def test_revoke_clears_my_share(client, test_user):
    """After revoking, GET /api/sharing/my returns null."""
    _, cookies = test_user

    await client.post("/api/sharing/create", cookies=cookies)
    await client.delete("/api/sharing/revoke", cookies=cookies)

    response = await client.get("/api/sharing/my", cookies=cookies)
    assert response.json()["data"] is None


@pytest.mark.asyncio(loop_scope="session")
async def test_public_pipeline_returns_display_name_and_stats(client, test_user):
    """GET /api/public/{slug} returns display_name, stats, and applications."""
    _, cookies = test_user

    create_resp = await client.post("/api/sharing/create", cookies=cookies)
    slug = create_resp.json()["data"]["slug"]

    response = await client.get(f"/api/public/{slug}")

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["display_name"] == "Share Tester"
    assert "stats" in data
    assert "applications" in data
    assert isinstance(data["applications"], list)


@pytest.mark.asyncio(loop_scope="session")
async def test_public_pipeline_404_for_invalid_slug(client):
    """GET /api/public/invalid returns 404."""
    response = await client.get("/api/public/doesnotexist1234")

    assert response.status_code == 404


@pytest.mark.asyncio(loop_scope="session")
async def test_public_pipeline_excludes_deleted_apps(client, test_user):
    """Deleted applications are not included in the public pipeline."""
    _, cookies = test_user

    # Create an application then delete it
    app_resp = await client.post("/api/applications", cookies=cookies, json={
        "role_title": "Hidden Role",
        "company": "Hidden Corp",
        "source": "manual",
    })
    app_id = app_resp.json()["data"]["id"]
    await client.delete(f"/api/applications/{app_id}", cookies=cookies)

    create_resp = await client.post("/api/sharing/create", cookies=cookies)
    slug = create_resp.json()["data"]["slug"]

    response = await client.get(f"/api/public/{slug}")
    apps = response.json()["data"]["applications"]
    titles = [a["role_title"] for a in apps]
    assert "Hidden Role" not in titles


@pytest.mark.asyncio(loop_scope="session")
async def test_create_share_requires_auth(client):
    """POST /api/sharing/create without auth returns 401."""
    response = await client.post("/api/sharing/create")
    assert response.status_code == 401


@pytest.mark.asyncio(loop_scope="session")
async def test_get_my_share_requires_auth(client):
    """GET /api/sharing/my without auth returns 401."""
    response = await client.get("/api/sharing/my")
    assert response.status_code == 401
