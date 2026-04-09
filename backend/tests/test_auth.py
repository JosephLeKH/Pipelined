"""Integration tests for auth router endpoints."""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest

import database

pytestmark = pytest.mark.asyncio(loop_scope="session")

REGISTER_PAYLOAD = {
    "email": "test@example.com",
    "password": "TestPass123!",
    "display_name": "Test User",
}


async def test_register_returns_201_with_user_data(client):
    # Act
    response = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)

    # Assert
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["email"] == "test@example.com"
    assert data["display_name"] == "Test User"
    assert "id" in data
    assert "password_hash" not in data


async def test_register_sets_auth_cookies(client):
    # Act
    response = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)

    # Assert
    assert "access_token" in response.cookies
    assert "refresh_token" in response.cookies


async def test_register_returns_409_for_duplicate_email(client):
    # Arrange
    await client.post("/api/auth/register", json=REGISTER_PAYLOAD)

    # Act
    response = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)

    # Assert
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "DUPLICATE_EMAIL"


async def test_login_returns_200_with_valid_credentials(client):
    # Arrange
    await client.post("/api/auth/register", json=REGISTER_PAYLOAD)

    # Act
    response = await client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "TestPass123!",
    })

    # Assert
    assert response.status_code == 200
    assert response.json()["data"]["email"] == "test@example.com"


async def test_login_sets_auth_cookies(client):
    # Arrange
    await client.post("/api/auth/register", json=REGISTER_PAYLOAD)

    # Act
    response = await client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "TestPass123!",
    })

    # Assert
    assert "access_token" in response.cookies
    assert "refresh_token" in response.cookies


async def test_login_returns_401_for_wrong_password(client):
    # Arrange
    await client.post("/api/auth/register", json=REGISTER_PAYLOAD)

    # Act
    response = await client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "WrongPass!",
    })

    # Assert
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "INVALID_CREDENTIALS"


async def test_login_returns_401_for_unknown_email(client):
    # Act
    response = await client.post("/api/auth/login", json={
        "email": "nobody@example.com",
        "password": "TestPass123!",
    })

    # Assert
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "INVALID_CREDENTIALS"


async def test_logout_returns_204(client):
    # Act
    response = await client.post("/api/auth/logout")

    # Assert
    assert response.status_code == 204


async def test_me_returns_current_user(client):
    # Arrange
    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    cookies = dict(reg.cookies)

    # Act
    response = await client.get("/api/auth/me", cookies=cookies)

    # Assert
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["email"] == "test@example.com"
    assert data["display_name"] == "Test User"


async def test_me_returns_401_without_auth(client):
    # Act
    response = await client.get("/api/auth/me")

    # Assert
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "MISSING_TOKEN"


async def test_me_returns_401_for_invalid_token(client):
    # Act
    response = await client.get("/api/auth/me", cookies={"access_token": "not.a.valid.token"})

    # Assert
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "INVALID_TOKEN"


async def test_refresh_issues_new_access_token(client):
    # Arrange
    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    refresh_token = reg.cookies["refresh_token"]

    # Act
    response = await client.post(
        "/api/auth/refresh",
        cookies={"refresh_token": refresh_token},
    )

    # Assert
    assert response.status_code == 200
    assert "access_token" in response.cookies
    assert response.json()["data"]["email"] == "test@example.com"


async def test_refresh_returns_401_without_refresh_cookie(client):
    # Act
    response = await client.post("/api/auth/refresh")

    # Assert
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "MISSING_TOKEN"


async def test_refresh_returns_401_for_invalid_token(client):
    # Act
    response = await client.post(
        "/api/auth/refresh",
        cookies={"refresh_token": "bad.token.here"},
    )

    # Assert
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "INVALID_TOKEN"


async def test_refresh_returns_401_when_access_token_used_as_refresh(client):
    # Arrange
    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    access_token = reg.cookies["access_token"]

    # Act — pass access token where refresh token is expected
    response = await client.post(
        "/api/auth/refresh",
        cookies={"refresh_token": access_token},
    )

    # Assert
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "WRONG_TOKEN_TYPE"


# ---------------------------------------------------------------------------
# Forgot-password and reset-password endpoint tests
# ---------------------------------------------------------------------------

RESET_PAYLOAD = {
    "email": "test@example.com",
    "password": "TestPass123!",
    "display_name": "Test User",
}


async def test_forgot_password_returns_200_for_existing_user(client):
    # Arrange
    await client.post("/api/auth/register", json=RESET_PAYLOAD)

    # Act
    with patch(
        "notifications.email_service.email_service.send_password_reset_email",
        new_callable=AsyncMock,
    ) as mock_send:
        response = await client.post(
            "/api/auth/forgot-password", json={"email": "test@example.com"}
        )

    # Assert
    assert response.status_code == 200
    assert "reset link has been sent" in response.json()["data"]["message"]
    mock_send.assert_awaited_once()


async def test_forgot_password_returns_200_for_nonexistent_email(client):
    # Act — email that does not exist
    with patch(
        "notifications.email_service.email_service.send_password_reset_email",
        new_callable=AsyncMock,
    ) as mock_send:
        response = await client.post(
            "/api/auth/forgot-password", json={"email": "nobody@example.com"}
        )

    # Assert — same 200 response (no enumeration)
    assert response.status_code == 200
    assert "reset link has been sent" in response.json()["data"]["message"]
    mock_send.assert_not_awaited()


async def test_reset_password_success(client):
    # Arrange — register and request a reset token
    await client.post("/api/auth/register", json=RESET_PAYLOAD)

    captured_token: list[str] = []

    async def capture_send(to_email: str, raw_token: str) -> None:
        captured_token.append(raw_token)

    with patch(
        "notifications.email_service.email_service.send_password_reset_email",
        side_effect=capture_send,
    ):
        await client.post("/api/auth/forgot-password", json={"email": "test@example.com"})

    # Act — reset the password with the captured token
    response = await client.post(
        "/api/auth/reset-password",
        json={"token": captured_token[0], "new_password": "NewPass456!"},
    )

    # Assert
    assert response.status_code == 200
    assert response.json()["data"]["message"] == "Password reset successfully."

    # Verify the new password works for login
    login_response = await client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "NewPass456!"},
    )
    assert login_response.status_code == 200


async def test_reset_password_returns_400_for_invalid_token(client):
    # Act — token that was never issued
    response = await client.post(
        "/api/auth/reset-password",
        json={"token": "deadbeef" * 8, "new_password": "NewPass456!"},
    )

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "TOKEN_INVALID"


async def test_reset_password_returns_400_for_expired_token(client):
    # Arrange — register and inject an already-expired token directly into DB
    await client.post("/api/auth/register", json=RESET_PAYLOAD)

    import hashlib
    raw_token = "a" * 64
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expired_at = datetime.now(timezone.utc) - timedelta(hours=2)

    users = database.get_collection("users")
    await users.update_one(
        {"email": "test@example.com"},
        {"$set": {"reset_token_hash": token_hash, "reset_token_expires_at": expired_at}},
    )

    # Act
    response = await client.post(
        "/api/auth/reset-password",
        json={"token": raw_token, "new_password": "NewPass456!"},
    )

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "TOKEN_EXPIRED"


# ---------------------------------------------------------------------------
# PATCH /api/auth/me — update default_stages
# ---------------------------------------------------------------------------


async def test_patch_me_updates_default_stages(client):
    # Arrange
    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    cookies = dict(reg.cookies)

    # Act
    response = await client.patch(
        "/api/auth/me",
        json={"default_stages": ["Applied", "Technical", "Final Round", "Offer", "Rejected"]},
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["default_stages"] == ["Applied", "Technical", "Final Round", "Offer", "Rejected"]


async def test_patch_me_returns_422_for_more_than_10_stages(client):
    # Arrange
    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    cookies = dict(reg.cookies)
    too_many = [f"Stage {i}" for i in range(11)]

    # Act
    response = await client.patch(
        "/api/auth/me",
        json={"default_stages": too_many},
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 422


async def test_patch_me_returns_422_for_fewer_than_2_stages(client):
    # Arrange
    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    cookies = dict(reg.cookies)

    # Act
    response = await client.patch(
        "/api/auth/me",
        json={"default_stages": ["OnlyOne"]},
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 422


async def test_patch_me_returns_401_without_auth(client):
    # Act
    response = await client.patch(
        "/api/auth/me",
        json={"default_stages": ["Applied", "Rejected"]},
    )

    # Assert
    assert response.status_code == 401


async def test_patch_me_rejects_invalid_timezone(client):
    # Arrange
    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    cookies = dict(reg.cookies)

    # Act
    response = await client.patch(
        "/api/auth/me",
        json={"timezone": "Not/AReal_Zone"},
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 422


async def test_patch_me_updates_timezone(client):
    # Arrange
    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    cookies = dict(reg.cookies)

    # Act
    response = await client.patch(
        "/api/auth/me",
        json={"timezone": "America/Los_Angeles"},
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 200
    assert response.json()["data"]["timezone"] == "America/Los_Angeles"
