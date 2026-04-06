"""Tests for the /health endpoint."""

import pytest

from config import DEV_JWT_SECRET, Settings, validate_production_secrets


@pytest.mark.asyncio
async def test_health_returns_200_with_ok_status(client):
    # Act
    response = await client.get("/health")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_health_cors_header_present_for_allowed_origin(client):
    # Act
    response = await client.get(
        "/health",
        headers={"Origin": "http://localhost:5173"},
    )

    # Assert
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_validate_production_secrets_raises_with_default_jwt_secret():
    # Arrange
    prod_settings = Settings(
        debug=False,
        jwt_secret=DEV_JWT_SECRET,
        openai_api_key="sk-real-key",
    )

    # Act / Assert
    with pytest.raises(RuntimeError, match="JWT_SECRET is set to the insecure dev default"):
        validate_production_secrets(prod_settings)


def test_validate_production_secrets_raises_with_empty_openai_key():
    # Arrange
    prod_settings = Settings(
        debug=False,
        jwt_secret="a-real-secret-value",
        openai_api_key="",
    )

    # Act / Assert
    with pytest.raises(RuntimeError, match="OPENAI_API_KEY is empty"):
        validate_production_secrets(prod_settings)


def test_validate_production_secrets_no_raise_in_debug_mode():
    # Arrange
    debug_settings = Settings(
        debug=True,
        jwt_secret=DEV_JWT_SECRET,
        openai_api_key="",
    )

    # Act / Assert — must not raise
    validate_production_secrets(debug_settings)
