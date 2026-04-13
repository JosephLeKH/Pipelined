"""Tests for GitHub OAuth: code exchange, profile fetch, and endpoint integration."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from auth.oauth_service import GithubCodeError, _exchange_github_code

pytestmark = pytest.mark.asyncio(loop_scope="session")

VALID_PROFILE = {
    "id": 12345,
    "login": "octocat",
    "name": "The Octocat",
    "email": None,
    "avatar_url": "https://avatars.githubusercontent.com/u/12345",
}

VALID_EMAILS = [
    {"email": "octocat@github.com", "primary": True, "verified": True},
    {"email": "octocat@alt.com", "primary": False, "verified": True},
]


def _make_mock_client(responses: list[tuple[int, dict]]) -> MagicMock:
    """Return a mock AsyncClient that yields (status_code, json) for each call."""
    mock_resps = []
    for status_code, body in responses:
        r = MagicMock()
        r.status_code = status_code
        r.json.return_value = body
        mock_resps.append(r)

    mock_client = AsyncMock()
    mock_client.post.return_value = mock_resps[0] if mock_resps else MagicMock()
    if len(mock_resps) > 1:
        mock_client.get.side_effect = mock_resps[1:]
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    return mock_client


# ---------------------------------------------------------------------------
# Pure-function tests (no MongoDB required)
# ---------------------------------------------------------------------------


async def test_exchange_github_code_raises_on_non_200():
    # Arrange
    mock_client = _make_mock_client([(400, {"error": "bad_verification_code"})])

    # Act / Assert
    with patch("auth.oauth_service.httpx.AsyncClient", return_value=mock_client):
        with pytest.raises(GithubCodeError):
            await _exchange_github_code("invalid-code")


async def test_exchange_github_code_raises_when_no_access_token():
    # Arrange — GitHub returns 200 but with error body (bad code)
    mock_client = _make_mock_client([(200, {"error": "bad_verification_code"})])

    # Act / Assert
    with patch("auth.oauth_service.httpx.AsyncClient", return_value=mock_client):
        with pytest.raises(GithubCodeError):
            await _exchange_github_code("expired-code")


# ---------------------------------------------------------------------------
# Integration tests (require live MongoDB, mock GitHub API)
# ---------------------------------------------------------------------------


def _patch_github(profile: dict, emails: list[dict], token_body: dict | None = None) -> MagicMock:
    """Patch auth.service.httpx.AsyncClient for the full github_auth flow."""
    if token_body is None:
        token_body = {"access_token": "gho_test123"}

    token_mock = MagicMock(status_code=200)
    token_mock.json.return_value = token_body

    profile_mock = MagicMock(status_code=200)
    profile_mock.json.return_value = profile

    emails_mock = MagicMock(status_code=200)
    emails_mock.json.return_value = emails

    # Three separate AsyncClient context managers are opened:
    # 1. _exchange_github_code → post()
    # 2. _fetch_github_profile → gather(get(), get())
    client1 = AsyncMock()
    client1.post.return_value = token_mock
    client1.__aenter__ = AsyncMock(return_value=client1)
    client1.__aexit__ = AsyncMock(return_value=None)

    client2 = AsyncMock()
    client2.get.side_effect = [profile_mock, emails_mock]
    client2.__aenter__ = AsyncMock(return_value=client2)
    client2.__aexit__ = AsyncMock(return_value=None)

    mock_constructor = MagicMock(side_effect=[client1, client2])
    return mock_constructor


async def test_github_auth_creates_new_user_and_returns_200(client):
    # Arrange
    mock_constructor = _patch_github(VALID_PROFILE, VALID_EMAILS)

    # Act
    with patch("auth.oauth_service.httpx.AsyncClient", mock_constructor):
        response = await client.post("/api/auth/github", json={"code": "valid-code"})

    # Assert
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["email"] == "octocat@github.com"
    assert data["display_name"] == "The Octocat"
    assert data["avatar_url"] == "https://avatars.githubusercontent.com/u/12345"
    assert data["email_verified"] is True
    assert "id" in data
    assert "password_hash" not in data


async def test_github_auth_sets_auth_cookies(client):
    # Arrange
    mock_constructor = _patch_github(VALID_PROFILE, VALID_EMAILS)

    # Act
    with patch("auth.oauth_service.httpx.AsyncClient", mock_constructor):
        response = await client.post("/api/auth/github", json={"code": "valid-code"})

    # Assert
    assert "access_token" in response.cookies
    assert "refresh_token" in response.cookies


async def test_github_auth_returns_existing_user_by_github_id(client):
    # Arrange — first sign-in creates the user
    mock1 = _patch_github(VALID_PROFILE, VALID_EMAILS)
    with patch("auth.oauth_service.httpx.AsyncClient", mock1):
        first = await client.post("/api/auth/github", json={"code": "valid-code"})
    first_id = first.json()["data"]["id"]

    # Act — second sign-in with same github_id
    mock2 = _patch_github(VALID_PROFILE, VALID_EMAILS)
    with patch("auth.oauth_service.httpx.AsyncClient", mock2):
        second = await client.post("/api/auth/github", json={"code": "valid-code"})

    # Assert — same user returned
    assert second.status_code == 200
    assert second.json()["data"]["id"] == first_id


async def test_github_auth_links_github_id_to_existing_email_user(client):
    # Arrange — register with email first
    profile_email = {**VALID_PROFILE, "id": 99999, "email": "link_test@example.com"}
    emails_list = [{"email": "link_test@example.com", "primary": True, "verified": True}]

    await client.post("/api/auth/register", json={
        "email": "link_test@example.com",
        "password": "TestPass123!",
        "display_name": "Existing User",
    })

    # Act — sign in with GitHub using the same email
    mock_constructor = _patch_github(profile_email, emails_list)
    with patch("auth.oauth_service.httpx.AsyncClient", mock_constructor):
        response = await client.post("/api/auth/github", json={"code": "valid-code"})

    # Assert — linked by email, same user
    assert response.status_code == 200
    assert response.json()["data"]["email"] == "link_test@example.com"


async def test_github_auth_falls_back_to_login_when_email_missing(client):
    # Arrange — profile with no email, no name, and no verified emails list
    profile_no_email = {**VALID_PROFILE, "id": 77777, "email": None, "name": None, "login": "noemail_user"}

    mock_constructor = _patch_github(profile_no_email, [])
    with patch("auth.oauth_service.httpx.AsyncClient", mock_constructor):
        response = await client.post("/api/auth/github", json={"code": "valid-code"})

    # Assert — user is created with None email and login as display_name
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["display_name"] == "noemail_user"
    assert data["email"] is None


async def test_github_auth_returns_401_on_bad_code(client):
    # Arrange — GitHub returns 400 for bad code
    token_mock = MagicMock(status_code=400)
    token_mock.json.return_value = {"error": "bad_verification_code"}

    mock_client = AsyncMock()
    mock_client.post.return_value = token_mock
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_constructor = MagicMock(return_value=mock_client)

    # Act
    with patch("auth.oauth_service.httpx.AsyncClient", mock_constructor):
        response = await client.post("/api/auth/github", json={"code": "bad-code"})

    # Assert
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "INVALID_GITHUB_CODE"
