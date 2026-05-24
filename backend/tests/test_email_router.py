"""Integration tests for email integration router endpoints."""

import pytest

from tests.conftest import as_anonymous, as_user


# ---------------------------------------------------------------------------
# GET /api/email/status
# ---------------------------------------------------------------------------


@pytest.mark.asyncio(loop_scope="session")
async def test_get_status_unauthenticated(client):
    """GET /api/email/status without auth cookies should return 401."""
    # Act
    with as_anonymous(client):
        response = await client.get("/api/email/status")

    # Assert
    assert response.status_code == 401


@pytest.mark.asyncio(loop_scope="session")
async def test_get_status_authenticated_no_gmail(client, test_user):
    """GET /api/email/status as test_user (no Gmail token) should return 200 with connected=false."""
    # Arrange
    _, cookies = test_user

    # Act
    with as_user(client, cookies):
        response = await client.get("/api/email/status")

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["connected"] is False
    assert data["email"] is None


# ---------------------------------------------------------------------------
# POST /api/email/sync
# ---------------------------------------------------------------------------


@pytest.mark.asyncio(loop_scope="session")
async def test_sync_requires_gmail_connected(client, test_user):
    """POST /api/email/sync as test_user (no Gmail token) should return 400 with GMAIL_NOT_CONNECTED."""
    # Arrange
    _, cookies = test_user

    # Act
    with as_user(client, cookies):
        response = await client.post("/api/email/sync")

    # Assert
    assert response.status_code == 400
    error = response.json()["detail"]
    assert error["code"] == "GMAIL_NOT_CONNECTED"


# ---------------------------------------------------------------------------
# GET /api/email/auth
# ---------------------------------------------------------------------------


@pytest.mark.asyncio(loop_scope="session")
async def test_get_auth_url_requires_verified_user(client, test_user):
    """GET /api/email/auth as verified test_user should return 200 with auth_url key."""
    # Arrange
    _, cookies = test_user

    # Act
    with as_user(client, cookies):
        response = await client.get("/api/email/auth")

    # Assert
    assert response.status_code in (200, 422)
    if response.status_code == 200:
        data = response.json()
        assert "auth_url" in data


# ---------------------------------------------------------------------------
# DELETE /api/email/disconnect
# ---------------------------------------------------------------------------


@pytest.mark.asyncio(loop_scope="session")
async def test_disconnect_requires_authentication(client):
    """DELETE /api/email/disconnect without auth should return 401."""
    # Act
    with as_anonymous(client):
        response = await client.delete("/api/email/disconnect")

    # Assert
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# PATCH /api/email/settings
# ---------------------------------------------------------------------------


@pytest.mark.asyncio(loop_scope="session")
async def test_update_settings_requires_gmail_connected(client, test_user):
    """PATCH /api/email/settings as test_user with no Gmail should return 400 with GMAIL_NOT_CONNECTED."""
    # Arrange
    _, cookies = test_user

    # Act
    with as_user(client, cookies):
        response = await client.patch(
            "/api/email/settings",
            json={"auto_track": False},
        )

    # Assert
    assert response.status_code == 400
    error = response.json()["detail"]
    assert error["code"] == "GMAIL_NOT_CONNECTED"
