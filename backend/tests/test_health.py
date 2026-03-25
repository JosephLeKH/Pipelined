"""Tests for the /health endpoint."""

import pytest


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
