"""HTTP-level tests for the interview prep SSE endpoint and follow-up draft endpoint."""

from unittest.mock import patch

import pytest
from bson import ObjectId

import database
from applications.interview_prep import router
from tests.conftest import as_anonymous, as_user

pytestmark = pytest.mark.asyncio(loop_scope="session")


# Interview prep stream endpoint tests

async def test_interview_prep_stream_unauthenticated(client, test_app_id):
    """GET /api/applications/{app_id}/interview-prep without auth returns 401."""
    # Act
    with as_anonymous(client):
        response = await client.get(f"/api/applications/{test_app_id}/interview-prep")

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

async def test_follow_up_draft_unauthenticated(client, test_app_id):
    """POST /api/applications/{app_id}/follow-up-draft without auth returns 401."""
    # Act
    with as_anonymous(client):
        response = await client.post(f"/api/applications/{test_app_id}/follow-up-draft")

    # Assert
    assert response.status_code == 401


async def test_follow_up_draft_no_api_key(client, test_user):
    """POST /api/applications/{app_id}/follow-up-draft with no gemini_api_key returns 503."""
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
            response = await client.post(f"/api/applications/{app_id}/follow-up-draft")

    # Assert
    assert response.status_code == 503
