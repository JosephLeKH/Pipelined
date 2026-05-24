"""HTTP-level tests for the interview prep SSE endpoint and follow-up draft endpoint."""

from unittest.mock import AsyncMock, patch

import pytest
from bson import ObjectId

import database
from applications.interview_prep import router
from tests.conftest import as_anonymous, as_user

pytestmark = pytest.mark.asyncio(loop_scope="session")

# Valid ObjectId shape; app need not exist for unauthenticated 401 checks.
_UNAUTH_APP_ID = "507f1f77bcf86cd799439011"


# Interview prep stream endpoint tests

async def test_interview_prep_stream_unauthenticated(client):
    """GET /api/applications/{app_id}/interview-prep without auth returns 401."""
    # Act
    with as_anonymous(client):
        response = await client.get(
            f"/api/applications/{_UNAUTH_APP_ID}/interview-prep"
        )

    # Assert
    assert response.status_code == 401


async def test_interview_prep_stream_app_not_found(client, test_user):
    """GET /api/applications/{nonexistent}/interview-prep returns 404."""
    # Arrange
    _, cookies = test_user
    nonexistent_id = str(ObjectId())

    # Act
    with as_user(client, cookies):
        response = await client.get(f"/api/applications/{nonexistent_id}/interview-prep")

    # Assert
    assert response.status_code == 404


async def test_interview_prep_stream_no_api_key(client, test_user):
    """GET /api/applications/{app_id}/interview-prep with no gemini_api_key returns 503."""
    # Arrange
    _, cookies = test_user

    with as_user(client, cookies):
        # Create app
        create_resp = await client.post("/api/applications", json={
            "role_title": "Software Engineer",
            "company": "Test Company",
            "source": "manual",
        })
        app_id = create_resp.json()["data"]["id"]

        # Act
        with patch.object(router.settings, "gemini_api_key", ""):
            response = await client.get(f"/api/applications/{app_id}/interview-prep")

        # Assert
        assert response.status_code == 503


async def test_interview_prep_stream_no_company(client, test_user):
    """GET interview-prep on app with no company returns 422."""
    # Arrange
    _, cookies = test_user
    # Create application without company field
    result = await database.get_collection("applications").insert_one({
        "user_id": ObjectId(test_user[0]["id"]),
        "company": "",
        "role_title": "SWE",
        "source": "manual",
    })
    app_id = str(result.inserted_id)

    # Act
    with as_user(client, cookies):
        response = await client.get(f"/api/applications/{app_id}/interview-prep")

    # Assert
    assert response.status_code == 422


# Follow-up draft endpoint tests

async def test_follow_up_draft_unauthenticated(client):
    """POST /api/applications/{app_id}/follow-up-draft without auth returns 401."""
    # Act
    with as_anonymous(client):
        response = await client.post(
            f"/api/applications/{_UNAUTH_APP_ID}/follow-up-draft"
        )

    # Assert
    assert response.status_code == 401


async def test_follow_up_draft_no_api_key(client, test_user):
    """POST follow-up-draft with no LLM keys configured returns 503."""
    # Arrange
    _, cookies = test_user

    with as_user(client, cookies):
        # Create app
        create_resp = await client.post("/api/applications", json={
            "role_title": "Software Engineer",
            "company": "Test Company",
            "source": "manual",
        })
        app_id = create_resp.json()["data"]["id"]

        # Act
        with patch.object(router.settings, "openrouter_api_key", ""), patch.object(
            router.settings, "gemini_api_key", ""
        ):
            response = await client.post(f"/api/applications/{app_id}/follow-up-draft")

    # Assert
    assert response.status_code == 503


async def test_follow_up_draft_logs_agent_run(client, test_user, monkeypatch):
    from ai.agent_log import AGENT_TYPE_FOLLOWUP, STATUS_SUCCESS

    monkeypatch.setattr("applications.interview_prep.router.agent_llm_configured", lambda: True)

    async def fake_generate(user_id, app_id, app_doc):  # noqa: ARG001
        return {"subject": "Following up", "body": "Hello there"}

    with patch("applications.interview_prep.router.follow_up_service.generate_follow_up_draft", fake_generate):
        _, cookies = test_user
        with as_user(client, cookies):
            create_resp = await client.post("/api/applications", json={
                "role_title": "Engineer",
                "company": "Acme",
                "source": "manual",
            })
            app_id = create_resp.json()["data"]["id"]
            response = await client.post(f"/api/applications/{app_id}/follow-up-draft")

    assert response.status_code == 200
    assert response.json()["data"]["subject"] == "Following up"


async def test_follow_up_draft_gemini_path_uses_cache_and_logs(test_user, monkeypatch):
    from ai.agent_log import AGENT_TYPE_FOLLOWUP, STATUS_SUCCESS
    from applications.interview_prep import service as follow_up_service

    user, _ = test_user
    user_id = user["id"]
    app_id = str(ObjectId())
    app_doc = {
        "company": "Acme",
        "role_title": "Engineer",
        "current_stage": "Applied",
    }

    monkeypatch.setattr(follow_up_service.settings, "openrouter_api_key", "")
    monkeypatch.setattr(follow_up_service.settings, "gemini_api_key", "test-key")
    monkeypatch.setattr(follow_up_service, "agent_llm_configured", lambda: True)

    draft = {"subject": "Hi", "body": "Checking in"}
    calls = {"gemini": 0, "log": 0}

    async def fake_gemini(user_id_arg, user_message):  # noqa: ARG001
        calls["gemini"] += 1
        return draft

    async def fake_log(user_id_arg, agent_type, status, summary, **kwargs):  # noqa: ARG001
        calls["log"] += 1
        assert agent_type == AGENT_TYPE_FOLLOWUP
        assert status == STATUS_SUCCESS

    monkeypatch.setattr(follow_up_service, "_generate_with_gemini", fake_gemini)
    monkeypatch.setattr(follow_up_service, "log_agent_run", fake_log)

    result = await follow_up_service.generate_follow_up_draft(user_id, app_id, app_doc)

    assert result == draft
    assert calls["gemini"] == 1
    assert calls["log"] == 1
