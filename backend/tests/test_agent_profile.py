"""Tests for agent_profile on user documents."""

import pytest

from tests.conftest import as_user

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_get_me_includes_default_agent_profile(client):
    response = await client.post("/api/auth/register", json={
        "email": "agent_profile@example.com",
        "password": "TestPass123!",
        "display_name": "Agent User",
    })

    data = response.json()["data"]
    profile = data["agent_profile"]

    assert profile["target_roles"] == []
    assert profile["preferred_locations"] == []
    assert profile["career_goals"] == ""
    assert profile["communication_style"] == "balanced"
    assert profile["memory_notes"] == ""


async def test_patch_me_updates_agent_profile(client, test_user):
    _, cookies = test_user
    payload = {
        "agent_profile": {
            "target_roles": ["Staff Engineer"],
            "preferred_locations": ["Remote"],
            "career_goals": "Move into staff IC",
            "communication_style": "concise",
            "memory_notes": "Prefer startups",
        }
    }

    with as_user(client, cookies):
        response = await client.patch("/api/auth/me", json=payload)

    assert response.status_code == 200
    profile = response.json()["data"]["agent_profile"]
    assert profile["target_roles"] == ["Staff Engineer"]
    assert profile["preferred_locations"] == ["Remote"]
    assert profile["career_goals"] == "Move into staff IC"
    assert profile["communication_style"] == "concise"
    assert profile["memory_notes"] == "Prefer startups"
