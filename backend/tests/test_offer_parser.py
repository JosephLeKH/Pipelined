"""Tests for offer letter extraction via OpenRouter."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from bson import ObjectId

import database
from auth.service import create_user
from email_integration.offer_parser import extract_offer_details
from email_integration.service import _apply_offer_details_from_email, _process_message

pytestmark = pytest.mark.asyncio(loop_scope="session")

MOCK_OFFER = {
    "base_salary": 175000,
    "signing_bonus": 20000,
    "equity": "0.12%",
    "start_date": "2026-08-01",
    "location": "New York, NY",
    "remote_policy": "Hybrid",
}


async def test_extract_offer_details_returns_validated_json(monkeypatch):
    """OpenRouter extract should return OfferDetails-shaped JSON."""
    monkeypatch.setattr("email_integration.offer_parser.settings.openrouter_api_key", "or-key")
    monkeypatch.setattr(
        "email_integration.offer_parser.check_budget",
        AsyncMock(return_value=True),
    )

    with patch(
        "email_integration.offer_parser.complete_json",
        new=AsyncMock(return_value=MOCK_OFFER),
    ):
        result = await extract_offer_details(
            "Your offer from Acme",
            "Base salary $175,000 with $20k signing bonus",
        )

    assert result is not None
    assert result["base_salary"] == 175000
    assert result["signing_bonus"] == 20000
    assert result["equity"] == "0.12%"


async def test_apply_offer_details_merges_onto_application(app):  # noqa: ARG001
    """Offer extract should persist offer_details on the application document."""
    user = await create_user("offer@example.com", "TestPass123!", "Offer User")
    user_id = str(user["_id"])

    apps_col = database.get_collection("applications")
    result = await apps_col.insert_one({
        "user_id": ObjectId(user_id),
        "company": "Acme",
        "role_title": "Engineer",
        "source": "email",
        "current_stage": "Offer",
        "offer_details": {"notes": "Existing note"},
    })
    app_id = str(result.inserted_id)

    with patch(
        "email_integration.service.extract_offer_details",
        new=AsyncMock(return_value={**MOCK_OFFER}),
    ):
        await _apply_offer_details_from_email(
            user_id,
            app_id,
            "Offer letter",
            "Comp details inside email",
        )

    doc = await apps_col.find_one({"_id": ObjectId(app_id)})
    assert doc is not None
    assert doc["offer_details"]["base_salary"] == 175000
    assert doc["offer_details"]["notes"] == "Existing note"


async def test_process_message_extracts_offer_on_offer_stage(app):  # noqa: ARG001
    """Offer-stage email classification should trigger offer_details extraction."""
    user = await create_user("offer-proc@example.com", "TestPass123!", "Offer Proc")
    user_id = str(user["_id"])

    apps_col = database.get_collection("applications")
    result = await apps_col.insert_one({
        "user_id": ObjectId(user_id),
        "company": "Acme Corp",
        "role_title": "Software Engineer",
        "source": "email",
        "current_stage": "Interviewing",
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
            "headers": [{"name": "Subject", "value": "Offer from Acme Corp"}],
            "body": {"data": ""},
        },
    }

    mock_client = AsyncMock()
    mock_client.__aenter__.return_value.get = AsyncMock(return_value=mock_resp)

    classify_result = {
        "job_related": True,
        "company": "Acme Corp",
        "role_title": "Software Engineer",
        "stage": "Offer",
    }

    with patch("httpx.AsyncClient", return_value=mock_client):
        with patch(
            "email_integration.service.classify_email",
            new=AsyncMock(return_value=classify_result),
        ):
            with patch(
                "email_integration.service.extract_offer_details",
                new=AsyncMock(return_value={**MOCK_OFFER}),
            ):
                await _process_message(user_doc, "tok", "msg-offer")

    doc = await apps_col.find_one({"_id": ObjectId(app_id)})
    assert doc is not None
    assert doc["current_stage"] == "Offer"
    assert doc["offer_details"]["base_salary"] == 175000
