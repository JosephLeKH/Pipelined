"""HTTP tests for agent activity feed."""

import pytest

from ai.agent_log import AGENT_TYPE_BRIEF, AGENT_TYPE_FIT, STATUS_SUCCESS, log_agent_run
from tests.conftest import as_anonymous, as_user

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_agent_activity_unauthenticated(client):
    with as_anonymous(client):
        response = await client.get("/api/agent/activity")

    assert response.status_code == 401


async def test_agent_activity_returns_user_runs(client, test_user):
    user, cookies = test_user
    user_id = user["id"]
    await log_agent_run(user_id, AGENT_TYPE_FIT, STATUS_SUCCESS, "Fit score 90: Strong match")
    await log_agent_run(user_id, AGENT_TYPE_BRIEF, STATUS_SUCCESS, "Morning brief ready")

    with as_user(client, cookies):
        response = await client.get("/api/agent/activity", params={"limit": 20})

    assert response.status_code == 200
    body = response.json()
    assert len(body["data"]) == 2
    assert body["meta"]["limit"] == 20
    assert body["data"][0]["agent_type"] in {AGENT_TYPE_FIT, AGENT_TYPE_BRIEF}


async def test_agent_activity_filters_by_application_id(client, test_user, test_app_id):
    user, cookies = test_user
    user_id = user["id"]
    other_app_id = "507f1f77bcf86cd799439011"

    await log_agent_run(
        user_id, AGENT_TYPE_FIT, STATUS_SUCCESS, "App-specific run", application_id=test_app_id
    )
    await log_agent_run(
        user_id, AGENT_TYPE_FIT, STATUS_SUCCESS, "Other app run", application_id=other_app_id
    )

    with as_user(client, cookies):
        response = await client.get(
            "/api/agent/activity",
            params={"application_id": test_app_id},
        )

    assert response.status_code == 200
    entries = response.json()["data"]
    assert len(entries) == 1
    assert entries[0]["summary"] == "App-specific run"
    assert entries[0]["application_id"] == test_app_id
