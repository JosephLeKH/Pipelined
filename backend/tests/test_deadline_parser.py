"""Tests for OA deadline extraction via OpenRouter."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from bson import ObjectId

import database
from auth.service import create_user
from email_integration.deadline_parser import extract_oa_deadline, normalize_deadline
from email_integration.service import _apply_oa_deadline_from_email, _process_message

pytestmark = pytest.mark.asyncio(loop_scope="session")

MOCK_DEADLINE = datetime(2026, 5, 30, 23, 59, tzinfo=timezone.utc)


async def test_extract_oa_deadline_returns_parsed_datetime(monkeypatch):
    """OpenRouter extract should return a timezone-aware datetime."""
    monkeypatch.setattr("email_integration.deadline_parser.settings.openrouter_api_key", "or-key")
    monkeypatch.setattr(
        "email_integration.deadline_parser.check_budget",
        AsyncMock(return_value=True),
    )

    with patch(
        "email_integration.deadline_parser.complete_json",
        new=AsyncMock(return_value={"deadline": "2026-05-30T23:59:00Z"}),
    ):
        result = await extract_oa_deadline(
            "Complete your HackerRank assessment",
            "Please finish by May 30, 2026",
        )

    assert result is not None
    assert result.year == 2026
    assert result.month == 5
    assert result.day == 30


def test_normalize_deadline_parses_date_only():
    """Date-only strings should default to end of day UTC."""
    result = normalize_deadline("2026-06-15")

    assert result is not None
    assert result.hour == 23
    assert result.minute == 59


async def test_apply_oa_deadline_sets_application_deadline(app):  # noqa: ARG001
    """OA extract should persist deadline on the application document."""
    user = await create_user("oa@example.com", "TestPass123!", "OA User")
    user_id = str(user["_id"])

    apps_col = database.get_collection("applications")
    result = await apps_col.insert_one({
        "user_id": ObjectId(user_id),
        "company": "Acme",
        "role_title": "Engineer",
        "source": "email",
        "current_stage": "OA",
    })
    app_id = str(result.inserted_id)

    with patch(
        "email_integration.service.extract_oa_deadline",
        new=AsyncMock(return_value=MOCK_DEADLINE),
    ):
        await _apply_oa_deadline_from_email(
            user_id,
            app_id,
            "OA invite",
            "Complete by May 30",
        )

    doc = await apps_col.find_one({"_id": ObjectId(app_id)})
    assert doc is not None
    stored = doc["deadline"].replace(tzinfo=timezone.utc) if doc["deadline"].tzinfo is None else doc["deadline"]
    assert stored == MOCK_DEADLINE


async def test_process_message_extracts_deadline_on_oa_stage(app):  # noqa: ARG001
    """OA-stage email classification should trigger deadline extraction."""
    user = await create_user("oa-proc@example.com", "TestPass123!", "OA Proc")
    user_id = str(user["_id"])

    apps_col = database.get_collection("applications")
    result = await apps_col.insert_one({
        "user_id": ObjectId(user_id),
        "company": "Acme Corp",
        "role_title": "Software Engineer",
        "source": "email",
        "current_stage": "Applied",
        "deleted": False,
    })
    app_id = str(result.inserted_id)

    user_doc = {
        "_id": ObjectId(user_id),
        "gmail_status_updates": True,
        "gmail_auto_track": True,
    }

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "payload": {
            "headers": [{"name": "Subject", "value": "HackerRank assessment"}],
            "body": {"data": ""},
        },
    }

    mock_client = AsyncMock()
    mock_client.__aenter__.return_value.get = AsyncMock(return_value=mock_resp)

    classify_result = {
        "job_related": True,
        "company": "Acme Corp",
        "role_title": "Software Engineer",
        "stage": "Assessment",
    }

    with patch("httpx.AsyncClient", return_value=mock_client):
        with patch(
            "email_integration.service.classify_email",
            new=AsyncMock(return_value=classify_result),
        ):
            with patch(
                "email_integration.service.extract_oa_deadline",
                new=AsyncMock(return_value=MOCK_DEADLINE),
            ):
                await _process_message(user_doc, "tok", "msg-oa")

    doc = await apps_col.find_one({"_id": ObjectId(app_id)})
    assert doc is not None
    assert doc["current_stage"] == "OA"
    stored = doc["deadline"].replace(tzinfo=timezone.utc) if doc["deadline"].tzinfo is None else doc["deadline"]
    assert stored == MOCK_DEADLINE
