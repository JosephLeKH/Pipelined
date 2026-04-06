"""Tests for Google OAuth: pure-function verification and endpoint integration."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from auth.service import GoogleTokenError, google_verify_id_token

pytestmark = pytest.mark.asyncio(loop_scope="session")

# ---------------------------------------------------------------------------
# Pure-function tests (no MongoDB required)
# ---------------------------------------------------------------------------

async def test_google_verify_id_token_returns_claims_on_200():
    # Arrange
    expected = {"sub": "uid-1", "email": "u@example.com", "name": "User"}
    mock_response = MagicMock(status_code=200)
    mock_response.json.return_value = expected
    mock_client = AsyncMock()
    mock_client.get.return_value = mock_response
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    # Act
    with patch("auth.service.httpx.AsyncClient", return_value=mock_client):
        claims = await google_verify_id_token("some-token")

    # Assert
    assert claims == expected


async def test_google_verify_id_token_raises_on_non_200():
    # Arrange
    mock_response = MagicMock(status_code=400)
    mock_response.json.return_value = {"error": "invalid_token"}
    mock_client = AsyncMock()
    mock_client.get.return_value = mock_response
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    # Act / Assert
    with patch("auth.service.httpx.AsyncClient", return_value=mock_client):
        with pytest.raises(GoogleTokenError):
            await google_verify_id_token("bad-token")


# ---------------------------------------------------------------------------
# Integration tests (require live MongoDB)
# ---------------------------------------------------------------------------

VALID_CLAIMS = {
    "sub": "google-uid-123",
    "email": "google@example.com",
    "name": "Google User",
    "email_verified": "true",
}


def _make_mock_http_client(status_code: int, json_body: dict) -> MagicMock:
    """Return a mock httpx.AsyncClient context manager."""
    mock_response = MagicMock()
    mock_response.status_code = status_code
    mock_response.json.return_value = json_body

    mock_client = AsyncMock()
    mock_client.get.return_value = mock_response
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    return mock_client


async def test_google_auth_creates_new_user_and_returns_200(client):
    # Arrange
    mock_client = _make_mock_http_client(200, VALID_CLAIMS)

    # Act
    with patch("auth.service.httpx.AsyncClient", return_value=mock_client):
        response = await client.post("/api/auth/google", json={"id_token": "valid-token"})

    # Assert
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["email"] == "google@example.com"
    assert data["display_name"] == "Google User"
    assert "id" in data
    assert "password_hash" not in data


async def test_google_auth_sets_auth_cookies(client):
    # Arrange
    mock_client = _make_mock_http_client(200, VALID_CLAIMS)

    # Act
    with patch("auth.service.httpx.AsyncClient", return_value=mock_client):
        response = await client.post("/api/auth/google", json={"id_token": "valid-token"})

    # Assert
    assert "access_token" in response.cookies
    assert "refresh_token" in response.cookies


async def test_google_auth_returns_existing_user_by_google_id(client):
    # Arrange — create the user on the first call
    mock_client = _make_mock_http_client(200, VALID_CLAIMS)
    with patch("auth.service.httpx.AsyncClient", return_value=mock_client):
        first = await client.post("/api/auth/google", json={"id_token": "valid-token"})

    first_id = first.json()["data"]["id"]

    # Act — sign in again with same Google token
    mock_client2 = _make_mock_http_client(200, VALID_CLAIMS)
    with patch("auth.service.httpx.AsyncClient", return_value=mock_client2):
        second = await client.post("/api/auth/google", json={"id_token": "valid-token"})

    # Assert — same user returned
    assert second.status_code == 200
    assert second.json()["data"]["id"] == first_id


async def test_google_auth_links_google_id_to_existing_email_user(client):
    # Arrange — register with email first
    await client.post("/api/auth/register", json={
        "email": "google@example.com",
        "password": "TestPass123!",
        "display_name": "Existing User",
    })

    # Act — sign in with Google using the same email
    mock_client = _make_mock_http_client(200, VALID_CLAIMS)
    with patch("auth.service.httpx.AsyncClient", return_value=mock_client):
        response = await client.post("/api/auth/google", json={"id_token": "valid-token"})

    # Assert — same user returned (linked by email)
    assert response.status_code == 200
    assert response.json()["data"]["email"] == "google@example.com"


async def test_google_auth_returns_401_when_google_rejects_token(client):
    # Arrange — Google returns 400 (invalid token)
    mock_client = _make_mock_http_client(400, {"error": "invalid_token"})

    # Act
    with patch("auth.service.httpx.AsyncClient", return_value=mock_client):
        response = await client.post("/api/auth/google", json={"id_token": "bad-token"})

    # Assert
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "INVALID_GOOGLE_TOKEN"


async def test_google_auth_uses_email_prefix_when_name_missing(client):
    # Arrange — claims without a name field
    claims_no_name = {
        "sub": "google-uid-456",
        "email": "noname@example.com",
        "email_verified": "true",
    }
    mock_client = _make_mock_http_client(200, claims_no_name)

    # Act
    with patch("auth.service.httpx.AsyncClient", return_value=mock_client):
        response = await client.post("/api/auth/google", json={"id_token": "valid-token"})

    # Assert — display_name falls back to email prefix
    assert response.status_code == 200
    assert response.json()["data"]["display_name"] == "noname"
