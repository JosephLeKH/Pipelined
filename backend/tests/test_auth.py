"""Integration tests for auth router endpoints."""

import pytest

REGISTER_PAYLOAD = {
    "email": "test@example.com",
    "password": "TestPass123!",
    "display_name": "Test User",
}


@pytest.mark.asyncio
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


@pytest.mark.asyncio
async def test_register_sets_auth_cookies(client):
    # Act
    response = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)

    # Assert
    assert "access_token" in response.cookies
    assert "refresh_token" in response.cookies


@pytest.mark.asyncio
async def test_register_returns_409_for_duplicate_email(client):
    # Arrange
    await client.post("/api/auth/register", json=REGISTER_PAYLOAD)

    # Act
    response = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)

    # Assert
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "DUPLICATE_EMAIL"


@pytest.mark.asyncio
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


@pytest.mark.asyncio
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


@pytest.mark.asyncio
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


@pytest.mark.asyncio
async def test_login_returns_401_for_unknown_email(client):
    # Act
    response = await client.post("/api/auth/login", json={
        "email": "nobody@example.com",
        "password": "TestPass123!",
    })

    # Assert
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_logout_returns_204(client):
    # Act
    response = await client.post("/api/auth/logout")

    # Assert
    assert response.status_code == 204


@pytest.mark.asyncio
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


@pytest.mark.asyncio
async def test_me_returns_401_without_auth(client):
    # Act
    response = await client.get("/api/auth/me")

    # Assert
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "MISSING_TOKEN"


@pytest.mark.asyncio
async def test_me_returns_401_for_invalid_token(client):
    # Act
    response = await client.get("/api/auth/me", cookies={"access_token": "not.a.valid.token"})

    # Assert
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "INVALID_TOKEN"


@pytest.mark.asyncio
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


@pytest.mark.asyncio
async def test_refresh_returns_401_without_refresh_cookie(client):
    # Act
    response = await client.post("/api/auth/refresh")

    # Assert
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "MISSING_TOKEN"


@pytest.mark.asyncio
async def test_refresh_returns_401_for_invalid_token(client):
    # Act
    response = await client.post(
        "/api/auth/refresh",
        cookies={"refresh_token": "bad.token.here"},
    )

    # Assert
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "INVALID_TOKEN"


@pytest.mark.asyncio
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
