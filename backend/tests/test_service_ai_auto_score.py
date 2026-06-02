"""Tests for auto_score_fit() — silent background fit-score trigger."""

from unittest.mock import AsyncMock, patch

import pytest
from bson import ObjectId

from applications.schemas import ApplicationCreate
from applications.service import create
from applications.service_ai import auto_score_fit
from auth.service import create_user
import database

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_auto_score_fit_skips_when_already_scored(app) -> None:  # noqa: ARG001
    """If ai_analysis already exists, do not re-score (Autopilot pre-scored)."""
    # Arrange: Create user and application with ai_analysis present
    user = await create_user("scored@example.com", "TestPass123!", "Scored User")
    user_id = str(user["_id"])
    app_doc = await create(user_id, ApplicationCreate(
        role_title="SWE",
        company="Acme",
        job_description="Python backend",
        source="manual",
    ))
    app_id = str(app_doc["_id"])

    # Add ai_analysis to mark as already scored
    apps = database.db["applications"]
    await apps.update_one(
        {"_id": ObjectId(app_id)},
        {"$set": {"ai_analysis": {"fit_score": 85}}}
    )

    # Act: Patch _score_and_update to verify it's NOT called
    with patch("applications.service_ai._score_and_update") as mock_score:
        await auto_score_fit(user_id, app_id)

    # Assert: _score_and_update should not have been called
    mock_score.assert_not_called()


async def test_auto_score_fit_skips_when_no_resume(app) -> None:  # noqa: ARG001
    """Skip silently when user has no resume text."""
    # Arrange: Create user with NO resume_text and an application
    user = await create_user("noresume@example.com", "TestPass123!", "No Resume User")
    user_id = str(user["_id"])
    app_doc = await create(user_id, ApplicationCreate(
        role_title="PM",
        company="Beta",
        job_description="Manage products",
        source="manual",
    ))
    app_id = str(app_doc["_id"])

    # Verify user has no resume_text
    users = database.db["users"]
    user_doc = await users.find_one({"_id": ObjectId(user_id)})
    assert "resume_text" not in user_doc or not user_doc.get("resume_text")

    # Act: Patch _score_and_update to verify it's NOT called
    with patch("applications.service_ai._score_and_update") as mock_score:
        await auto_score_fit(user_id, app_id)

    # Assert: _score_and_update should not have been called
    mock_score.assert_not_called()


async def test_auto_score_fit_calls_score_and_update_when_eligible(app) -> None:  # noqa: ARG001
    """Happy path — invokes underlying scorer when resume present and not yet scored."""
    # Arrange: Create user WITH resume_text and an application without ai_analysis
    user = await create_user("withresume@example.com", "TestPass123!", "With Resume User")
    user_id = str(user["_id"])

    # Add resume_text to user
    users = database.db["users"]
    await users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"resume_text": "Python, JavaScript, React"}}
    )

    app_doc = await create(user_id, ApplicationCreate(
        role_title="Frontend Engineer",
        company="Gamma",
        job_description="React frontend role",
        source="manual",
    ))
    app_id = str(app_doc["_id"])

    # Verify app does not have ai_analysis
    apps = database.db["applications"]
    app_doc = await apps.find_one({"_id": ObjectId(app_id)})
    assert "ai_analysis" not in app_doc

    # Act: Patch _score_and_update and call auto_score_fit
    with patch("applications.service_ai._score_and_update", new_callable=AsyncMock) as mock_score:
        await auto_score_fit(user_id, app_id)

    # Assert: _score_and_update was called with correct args
    mock_score.assert_awaited_once()
    call_kwargs = mock_score.call_args[1]
    assert call_kwargs["app_id"] == app_id
    assert call_kwargs["user_id"] == user_id
    assert call_kwargs["resume_text"] == "Python, JavaScript, React"
    assert call_kwargs["job_description"] == "React frontend role"
    assert call_kwargs["role_title"] == "Frontend Engineer"
    assert call_kwargs["company"] == "Gamma"


async def test_auto_score_fit_swallows_errors(app) -> None:  # noqa: ARG001
    """Generator failures must not propagate; log and return."""
    # Arrange: Create user and application in eligible state
    user = await create_user("error@example.com", "TestPass123!", "Error User")
    user_id = str(user["_id"])

    users = database.db["users"]
    await users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"resume_text": "Test resume"}}
    )

    app_doc = await create(user_id, ApplicationCreate(
        role_title="SWE",
        company="Delta",
        job_description="Job desc",
        source="manual",
    ))
    app_id = str(app_doc["_id"])

    # Act: Patch _score_and_update to raise an exception
    with patch("applications.service_ai._score_and_update", side_effect=RuntimeError("Oops")):
        # Should not raise — error is swallowed
        await auto_score_fit(user_id, app_id)

    # Assert: No exception was raised (function returned normally)
    # (If we got here, the test passed)


async def test_auto_score_fit_skips_when_app_not_found(app) -> None:  # noqa: ARG001
    """Skip silently when app does not exist."""
    # Arrange: Create user but use a non-existent app_id
    user = await create_user("appnotfound@example.com", "TestPass123!", "App Not Found User")
    user_id = str(user["_id"])
    fake_app_id = str(ObjectId())

    # Act: Patch _score_and_update to verify it's NOT called
    with patch("applications.service_ai._score_and_update") as mock_score:
        await auto_score_fit(user_id, fake_app_id)

    # Assert: _score_and_update should not have been called
    mock_score.assert_not_called()


async def test_auto_score_fit_is_idempotent(app) -> None:  # noqa: ARG001
    """Calling auto_score_fit twice on same app should only score once."""
    # Arrange: Create user with resume and application
    user = await create_user("idem@example.com", "TestPass123!", "Idem User")
    user_id = str(user["_id"])

    users = database.db["users"]
    await users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"resume_text": "Resume content"}}
    )

    app_doc = await create(user_id, ApplicationCreate(
        role_title="Role",
        company="Company",
        job_description="JD",
        source="manual",
    ))
    app_id = str(app_doc["_id"])

    # Act: First call
    fit_result = {
        "fit_score": 75,
        "summary": "Good fit",
        "matched_skills": ["Python"],
        "missing_skills": [],
    }
    with patch("applications.service_ai._score_and_update", new_callable=AsyncMock):
        # Manually set ai_analysis to simulate first scoring completed
        apps = database.db["applications"]
        await apps.update_one(
            {"_id": ObjectId(app_id)},
            {"$set": {"ai_analysis": fit_result}}
        )

    # Act: Second call
    with patch("applications.service_ai._score_and_update") as mock_score:
        await auto_score_fit(user_id, app_id)

    # Assert: Second call should not invoke _score_and_update due to idempotency check
    mock_score.assert_not_called()
