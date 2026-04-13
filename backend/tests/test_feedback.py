"""Integration tests for the feedback endpoint."""

import pytest

pytestmark = pytest.mark.asyncio(loop_scope="session")

REGISTER_PAYLOAD = {
    "email": "feedback_user@example.com",
    "password": "TestPass123!",
    "display_name": "Feedback User",
}


async def test_submit_feedback_returns_201(client):
    # Act
    response = await client.post(
        "/api/feedback",
        json={
            "message": "This is great!",
            "email": "user@example.com",
            "category": "General",
            "page": "/dashboard",
        },
    )

    # Assert
    assert response.status_code == 201
    data = response.json()["data"]
    assert "id" in data
    assert "Thank you" in data["message"]


async def test_submit_feedback_without_auth_succeeds(client):
    # Act — no auth cookies
    response = await client.post(
        "/api/feedback",
        json={
            "message": "Bug report without login",
            "email": None,
            "category": "Bug",
            "page": "/jobs",
        },
    )

    # Assert
    assert response.status_code == 201


async def test_submit_feedback_with_auth_attaches_user(client):
    # Arrange — register and log in
    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    cookies = dict(reg.cookies)

    # Act
    response = await client.post(
        "/api/feedback",
        json={
            "message": "Feature request from logged-in user",
            "email": "feedback_user@example.com",
            "category": "Feature Request",
            "page": "/settings",
        },
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 201
    data = response.json()["data"]
    assert "id" in data


async def test_submit_feedback_rejects_empty_message(client):
    # Act
    response = await client.post(
        "/api/feedback",
        json={
            "message": "",
            "email": None,
            "category": "General",
            "page": "/",
        },
    )

    # Assert
    assert response.status_code == 422


async def test_submit_nps_feedback(client):
    # Act
    response = await client.post(
        "/api/feedback",
        json={
            "message": "9",
            "email": None,
            "category": "nps",
            "page": "/dashboard",
        },
    )

    # Assert
    assert response.status_code == 201
