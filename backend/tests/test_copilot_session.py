"""Tests for co-pilot session persistence."""

from bson import ObjectId
import pytest

import database
from tests.conftest import as_anonymous, as_user

pytestmark = pytest.mark.asyncio(loop_scope="session")

SAMPLE_MESSAGES = [
    {"role": "user", "content": "What should I focus on?", "actions": []},
    {
        "role": "assistant",
        "content": "Review your pipeline.",
        "actions": [{"action": "open_app", "path": "/today", "label": "Open Today"}],
    },
]


async def test_get_copilot_session_unauthenticated(client):
    with as_anonymous(client):
        response = await client.get("/api/copilot/session")

    assert response.status_code == 401


async def test_get_copilot_session_returns_empty_messages(client, test_user):
    _, cookies = test_user

    with as_user(client, cookies):
        response = await client.get("/api/copilot/session")

    assert response.status_code == 200
    assert response.json()["data"]["messages"] == []


async def test_save_and_get_copilot_session(client, test_user):
    user, cookies = test_user

    with as_user(client, cookies):
        save_response = await client.post(
            "/api/copilot/session",
            json={"messages": SAMPLE_MESSAGES},
        )
        get_response = await client.get("/api/copilot/session")

    assert save_response.status_code == 200
    assert save_response.json()["data"]["messages"] == SAMPLE_MESSAGES
    assert get_response.status_code == 200
    assert get_response.json()["data"]["messages"] == SAMPLE_MESSAGES

    doc = await database.get_collection("copilot_sessions").find_one(
        {"user_id": ObjectId(user["id"])},
    )
    assert doc is not None
    assert doc["messages"] == SAMPLE_MESSAGES
    assert "updated_at" in doc


async def test_save_copilot_session_scoped_by_user_id(client, test_user):
    user_a, cookies_a = test_user
    user_b, cookies_b = await _register_second_user(client)

    with as_user(client, cookies_a):
        await client.post("/api/copilot/session", json={"messages": SAMPLE_MESSAGES})

    with as_user(client, cookies_b):
        response = await client.get("/api/copilot/session")

    assert response.status_code == 200
    assert response.json()["data"]["messages"] == []


async def test_save_copilot_session_clears_messages(client, test_user):
    _, cookies = test_user

    with as_user(client, cookies):
        await client.post("/api/copilot/session", json={"messages": SAMPLE_MESSAGES})
        clear_response = await client.post("/api/copilot/session", json={"messages": []})
        get_response = await client.get("/api/copilot/session")

    assert clear_response.status_code == 200
    assert clear_response.json()["data"]["messages"] == []
    assert get_response.json()["data"]["messages"] == []


async def _register_second_user(client):
    response = await client.post(
        "/api/auth/register",
        json={
            "email": "copilot-session-b@example.com",
            "password": "password123",
            "display_name": "User B",
        },
    )
    assert response.status_code == 201
    user = response.json()["data"]
    cookies = response.cookies
    return user, cookies
