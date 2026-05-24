"""HTTP-level tests for POST /api/applications/{app_id}/apply-pack."""

from unittest.mock import AsyncMock, patch

import pytest
from bson import ObjectId

import database
from config import settings
from tests.conftest import as_anonymous, as_user

pytestmark = pytest.mark.asyncio(loop_scope="session")

_UNAUTH_APP_ID = "507f1f77bcf86cd799439011"

_MOCK_APPLY_PACK = {
    "cover_letter": "Dear hiring team,\n\nI am excited to apply...",
    "short_answers": [
        {"question": "Why this company?", "answer": "Mission alignment and growth."},
    ],
    "linkedin_note": "Hi — I applied for the SWE role and would love to connect.",
    "talking_points": ["5 years Python", "Led API migration"],
}


async def test_apply_pack_unauthenticated(client):
    """POST apply-pack without auth returns 401."""
    with as_anonymous(client):
        response = await client.post(f"/api/applications/{_UNAUTH_APP_ID}/apply-pack")

    assert response.status_code == 401


async def test_apply_pack_no_job_description(client, test_user):
    """POST apply-pack when application has no job_description returns 422."""
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
        response = await client.post(f"/api/applications/{app_id}/apply-pack")

    assert response.status_code == 422


async def test_apply_pack_no_resume(client, test_user):
    """POST apply-pack when user has no resume returns 422."""
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
        response = await client.post(f"/api/applications/{app_id}/apply-pack")

    assert response.status_code == 422


async def test_apply_pack_success(client, test_user):
    """POST apply-pack returns 200 with mocked OpenRouter response."""
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
            "applications.apply_pack.service.complete_json",
            new_callable=AsyncMock,
            return_value=_MOCK_APPLY_PACK,
        ):
            response = await client.post(f"/api/applications/{app_id}/apply-pack")

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["cover_letter"] == _MOCK_APPLY_PACK["cover_letter"]
    assert data["talking_points"] == _MOCK_APPLY_PACK["talking_points"]
    assert len(data["short_answers"]) == 1

    doc = await database.get_collection("applications").find_one({"_id": ObjectId(app_id)})
    assert doc.get("apply_pack") is not None
    assert doc.get("apply_pack_at") is not None


async def test_apply_pack_no_api_key(client, test_user):
    """POST apply-pack with no OpenRouter key returns 503."""
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
            response = await client.post(f"/api/applications/{app_id}/apply-pack")

    assert response.status_code == 503
