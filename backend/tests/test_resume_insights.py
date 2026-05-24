"""HTTP-level tests for POST /api/applications/{app_id}/resume-insights."""

from unittest.mock import AsyncMock, patch

import pytest
from bson import ObjectId

import database
from config import settings
from tests.conftest import as_anonymous, as_user

pytestmark = pytest.mark.asyncio(loop_scope="session")

_UNAUTH_APP_ID = "507f1f77bcf86cd799439011"

_MOCK_INSIGHTS = {
    "keyword_gaps": ["Kubernetes", "GraphQL"],
    "section_suggestions": ["Move cloud experience higher"],
    "bullet_rewrites": [
        {"original": "Built APIs", "suggested": "Built REST APIs serving 1M req/day"},
    ],
    "overall_summary": "Strong backend fit with minor keyword gaps.",
}


async def test_resume_insights_unauthenticated(client):
    """POST resume-insights without auth returns 401."""
    with as_anonymous(client):
        response = await client.post(f"/api/applications/{_UNAUTH_APP_ID}/resume-insights")

    assert response.status_code == 401


async def test_resume_insights_no_job_description(client, test_user):
    """POST resume-insights when application has no job_description returns 422."""
    user, cookies = test_user

    with as_user(client, cookies):
        create_resp = await client.post("/api/applications", json={
            "role_title": "Software Engineer",
            "company": "Acme Corp",
            "source": "manual",
        })
        app_id = create_resp.json()["data"]["id"]
        await database.get_collection("users").update_one(
            {"_id": ObjectId(user["id"])},
            {"$set": {"resume_text": "Experienced Python developer"}},
        )
        response = await client.post(f"/api/applications/{app_id}/resume-insights")

    assert response.status_code == 422


async def test_resume_insights_no_resume(client, test_user):
    """POST resume-insights when user has no resume returns 422."""
    user, cookies = test_user

    with as_user(client, cookies):
        create_resp = await client.post("/api/applications", json={
            "role_title": "Software Engineer",
            "company": "Acme Corp",
            "source": "manual",
            "job_description": "Looking for a Python engineer with FastAPI experience.",
        })
        app_id = create_resp.json()["data"]["id"]
        await database.get_collection("users").update_one(
            {"_id": ObjectId(user["id"])},
            {"$unset": {"resume_text": ""}},
        )
        response = await client.post(f"/api/applications/{app_id}/resume-insights")

    assert response.status_code == 422


async def test_resume_insights_success(client, test_user):
    """POST resume-insights returns 200 with mocked OpenRouter response."""
    user, cookies = test_user

    with as_user(client, cookies):
        create_resp = await client.post("/api/applications", json={
            "role_title": "Software Engineer",
            "company": "Acme Corp",
            "source": "manual",
            "job_description": "Python, FastAPI, MongoDB required.",
        })
        app_id = create_resp.json()["data"]["id"]
        await database.get_collection("users").update_one(
            {"_id": ObjectId(user["id"])},
            {"$set": {"resume_text": "Python developer with 5 years experience."}},
        )

        with patch.object(settings, "openrouter_api_key", "test-key"), patch(
            "applications.resume_insights.service.complete_json",
            new_callable=AsyncMock,
            return_value=_MOCK_INSIGHTS,
        ):
            response = await client.post(f"/api/applications/{app_id}/resume-insights")

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["keyword_gaps"] == _MOCK_INSIGHTS["keyword_gaps"]
    assert data["overall_summary"] == _MOCK_INSIGHTS["overall_summary"]

    doc = await database.get_collection("applications").find_one({"_id": ObjectId(app_id)})
    assert doc.get("resume_insights") is not None
    assert doc.get("resume_insights_at") is not None


async def test_resume_insights_no_api_key(client, test_user):
    """POST resume-insights with no OpenRouter key returns 503."""
    user, cookies = test_user

    with as_user(client, cookies):
        create_resp = await client.post("/api/applications", json={
            "role_title": "Software Engineer",
            "company": "Acme Corp",
            "source": "manual",
            "job_description": "Python role.",
        })
        app_id = create_resp.json()["data"]["id"]
        await database.get_collection("users").update_one(
            {"_id": ObjectId(user["id"])},
            {"$set": {"resume_text": "Python developer"}},
        )

        with patch.object(settings, "openrouter_api_key", ""):
            response = await client.post(f"/api/applications/{app_id}/resume-insights")

    assert response.status_code == 503
