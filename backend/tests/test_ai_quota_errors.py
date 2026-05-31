"""Test AI quota error handling in routers."""

import asyncio
import pytest
from fastapi import HTTPException
from unittest.mock import AsyncMock, patch
from bson import ObjectId

from ai.exceptions import AIQuotaExceededError
from ai.openrouter_client import OpenRouterError
from applications.apply_pack import service as apply_pack_service
from applications.apply_pack.service import (
    ApplicationNotFoundError,
    MissingJobDescriptionError,
    MissingResumeError,
)
import database


@pytest.mark.asyncio
async def test_apply_pack_router_handles_ai_quota_exceeded(client, test_user, test_app_id):
    """POST /api/applications/{id}/apply-pack returns 429 on AIQuotaExceededError."""
    _, cookies = test_user

    with patch.object(
        apply_pack_service,
        "generate_apply_pack",
        side_effect=AIQuotaExceededError(),
    ):
        response = await client.post(
            f"/api/applications/{test_app_id}/apply-pack",
            cookies=cookies,
        )

    assert response.status_code == 429
    data = response.json()
    assert data["detail"]["code"] == "ai_quota_exceeded"
    assert "AI quota" in data["detail"]["message"]
    assert response.headers.get("Retry-After") == "60"


@pytest.mark.asyncio
async def test_apply_pack_router_handles_openrouter_error(client, test_user, test_app_id):
    """POST /api/applications/{id}/apply-pack returns 503 on OpenRouterError."""
    _, cookies = test_user

    with patch.object(
        apply_pack_service,
        "generate_apply_pack",
        side_effect=OpenRouterError("No provider configured"),
    ):
        response = await client.post(
            f"/api/applications/{test_app_id}/apply-pack",
            cookies=cookies,
        )

    assert response.status_code == 503
    data = response.json()
    assert data["detail"]["code"] == "AI_NOT_CONFIGURED"


@pytest.mark.asyncio
async def test_background_fit_score_timeout_persists_error_status(test_user, test_app_id):
    """_score_and_update persists fit_score_status: 'error' on timeout."""
    from applications.service_ai import _score_and_update

    user_doc, _ = test_user
    user_id = ObjectId(user_doc["id"])
    app_id = ObjectId(test_app_id)

    # Create a test application document
    apps = database.db["applications"]
    await apps.insert_one({
        "_id": app_id,
        "user_id": user_id,
        "role_title": "Test Role",
        "company": "Test Company",
    })

    with patch("applications.service_ai.score_fit", side_effect=asyncio.TimeoutError()):
        await _score_and_update(
            str(user_id),
            str(app_id),
            "test resume",
            "test jd",
        )

    # Verify status was persisted
    app_doc = await apps.find_one({"_id": app_id})
    assert app_doc.get("fit_score_status") == "error"
    assert app_doc.get("fit_score_error_code") == "timeout"
    assert app_doc.get("fit_score_error_at") is not None


@pytest.mark.asyncio
async def test_background_fit_score_quota_error_persists_error_status(test_user, test_app_id):
    """_score_and_update persists fit_score_status: 'error' on QuotaExceededError."""
    from applications.service_ai import _score_and_update
    from parsing.ai_cache import QuotaExceededError

    user_doc, _ = test_user
    user_id = ObjectId(user_doc["id"])
    app_id = ObjectId(test_app_id)

    # Create a test application document
    apps = database.db["applications"]
    await apps.insert_one({
        "_id": app_id,
        "user_id": user_id,
        "role_title": "Test Role",
        "company": "Test Company",
    })

    with patch("applications.service_ai.score_fit", side_effect=QuotaExceededError(20)):
        await _score_and_update(
            str(user_id),
            str(app_id),
            "test resume",
            "test jd",
        )

    # Verify status was persisted
    app_doc = await apps.find_one({"_id": app_id})
    assert app_doc.get("fit_score_status") == "error"
    assert app_doc.get("fit_score_error_code") == "quota"
    assert app_doc.get("fit_score_error_at") is not None


@pytest.mark.asyncio
async def test_background_fit_score_success_persists_complete_status(test_user, test_app_id):
    """_score_and_update persists fit_score_status: 'complete' on success."""
    from applications.service_ai import _score_and_update

    user_doc, _ = test_user
    user_id = ObjectId(user_doc["id"])
    app_id = ObjectId(test_app_id)

    # Create a test application document
    apps = database.db["applications"]
    await apps.insert_one({
        "_id": app_id,
        "user_id": user_id,
        "role_title": "Test Role",
        "company": "Test Company",
    })

    fit_result = {
        "fit_score": 78,
        "summary": "Good match",
        "matched_skills": ["Python"],
        "missing_skills": [],
    }

    with patch("applications.service_ai.score_fit", return_value=fit_result):
        await _score_and_update(
            str(user_id),
            str(app_id),
            "test resume",
            "test jd",
        )

    # Verify status was persisted
    app_doc = await apps.find_one({"_id": app_id})
    assert app_doc.get("fit_score_status") == "complete"
    assert app_doc.get("fit_score_computed_at") is not None
    assert app_doc.get("ai_analysis", {}).get("fit_score") == 78
