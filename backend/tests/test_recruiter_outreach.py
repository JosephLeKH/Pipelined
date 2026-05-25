"""Integration tests for recruiter outreach inbox: classifier, service, and API routes."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from bson import ObjectId

import database
from autopilot.constants import PENDING_STATUS
from email_integration.classifier import LABEL_RECRUITER_OUTREACH, SYSTEM_PROMPT
from email_integration.recruiter_outreach import (
    create_recruiter_lead,
    get_recruiter_lead,
    list_recruiter_leads,
    set_lead_status,
)
from tests.conftest import as_anonymous, as_user

pytestmark = pytest.mark.asyncio(loop_scope="session")

FAKE_CLASSIFIER_RESPONSE = {
    "job_related": True,
    "label": "recruiter_outreach",
    "company": "Stripe",
    "role_title": "Senior Backend Engineer",
}


# ---------------------------------------------------------------------------
# Classifier label constant
# ---------------------------------------------------------------------------


def test_classifier_has_recruiter_outreach_label():
    assert LABEL_RECRUITER_OUTREACH == "recruiter_outreach"


def test_system_prompt_mentions_recruiter_outreach():
    assert "recruiter_outreach" in SYSTEM_PROMPT
    assert "RECRUITER OUTREACH" in SYSTEM_PROMPT


# ---------------------------------------------------------------------------
# recruiter_outreach service helpers
# ---------------------------------------------------------------------------


async def test_create_recruiter_lead_inserts_correctly(test_user):
    user, _ = test_user
    user_id = user["id"]

    doc = await create_recruiter_lead(user_id, "Google", "SWE Intern", "Exciting opportunity!")

    assert doc is not None
    assert doc["company"] == "Google"
    assert doc["status"] == PENDING_STATUS
    assert doc["user_id"] == ObjectId(user_id)
    assert doc["role_title"] == "SWE Intern"
    assert doc["subject"] == "Exciting opportunity!"


async def test_create_recruiter_lead_deduplicates_by_company(test_user):
    user, _ = test_user
    user_id = user["id"]

    first = await create_recruiter_lead(user_id, "Stripe", None, "Subject A")
    second = await create_recruiter_lead(user_id, "Stripe", None, "Subject B")

    assert first is not None
    assert second is None  # duplicate suppressed


async def test_list_recruiter_leads_scoped_to_user(test_user, other_user):
    user, _ = test_user
    other, _ = other_user

    await create_recruiter_lead(user["id"], "Meta", "Staff Eng", "Meta recruiter")
    await create_recruiter_lead(other["id"], "Amazon", "SDE II", "Amazon recruiter")

    docs = await list_recruiter_leads(user["id"])

    companies = [d["company"] for d in docs]
    assert "Meta" in companies
    assert "Amazon" not in companies


async def test_set_lead_status_updates_correctly(test_user):
    user, _ = test_user

    doc = await create_recruiter_lead(user["id"], "Netflix", None, "Netflix outreach")
    assert doc is not None
    lead_id = str(doc["_id"])

    success = await set_lead_status(user["id"], lead_id, "dismissed")

    assert success is True
    updated = await get_recruiter_lead(user["id"], lead_id)
    assert updated["status"] == "dismissed"


# ---------------------------------------------------------------------------
# API: GET /api/autopilot/recruiter-leads
# ---------------------------------------------------------------------------


async def test_list_recruiter_leads_requires_auth(client):
    with as_anonymous(client):
        response = await client.get("/api/autopilot/recruiter-leads")

    assert response.status_code == 401


async def test_list_recruiter_leads_returns_pending(client, test_user):
    user, cookies = test_user
    await create_recruiter_lead(user["id"], "OpenAI", "Research Engineer", "Excited to reach out")

    with as_user(client, cookies):
        response = await client.get("/api/autopilot/recruiter-leads")

    assert response.status_code == 200
    data = response.json()["data"]
    companies = [item["company"] for item in data]
    assert "OpenAI" in companies


async def test_list_recruiter_leads_excludes_other_users(client, test_user, other_user):
    other, _ = other_user
    user, cookies = test_user
    await create_recruiter_lead(other["id"], "Anthropic", None, "Other user lead")

    with as_user(client, cookies):
        response = await client.get("/api/autopilot/recruiter-leads")

    assert response.status_code == 200
    data = response.json()["data"]
    companies = [item["company"] for item in data]
    assert "Anthropic" not in companies


# ---------------------------------------------------------------------------
# API: POST /api/autopilot/recruiter-leads/{id}/add-to-watchlist
# ---------------------------------------------------------------------------


async def test_add_to_watchlist_marks_lead_and_adds_company(client, test_user):
    user, cookies = test_user
    doc = await create_recruiter_lead(user["id"], "Figma", "Product Eng", "Figma opportunity")
    lead_id = str(doc["_id"])

    with as_user(client, cookies):
        response = await client.post(f"/api/autopilot/recruiter-leads/{lead_id}/add-to-watchlist")

    assert response.status_code == 200
    body = response.json()["data"]
    assert body["lead_id"] == lead_id
    assert body["company"] == "Figma"

    updated = await get_recruiter_lead(user["id"], lead_id)
    assert updated["status"] == "added_to_watchlist"

    user_doc = await database.get_collection("users").find_one({"_id": ObjectId(user["id"])})
    company_names = [c["name"] for c in (user_doc.get("watchlist_companies") or [])]
    assert "Figma" in company_names


async def test_add_to_watchlist_does_not_duplicate_company(client, test_user):
    user, cookies = test_user
    await database.get_collection("users").update_one(
        {"_id": ObjectId(user["id"])},
        {"$set": {"watchlist_companies": [{"name": "Canva", "careers_url": ""}]}},
    )
    doc = await create_recruiter_lead(user["id"], "Canva", None, "Canva outreach")
    lead_id = str(doc["_id"])

    with as_user(client, cookies):
        await client.post(f"/api/autopilot/recruiter-leads/{lead_id}/add-to-watchlist")

    user_doc = await database.get_collection("users").find_one({"_id": ObjectId(user["id"])})
    canva_entries = [c for c in (user_doc.get("watchlist_companies") or []) if c["name"] == "Canva"]
    assert len(canva_entries) == 1


async def test_add_to_watchlist_returns_404_for_other_user_lead(client, test_user, other_user):
    other, _ = other_user
    user, cookies = test_user
    doc = await create_recruiter_lead(other["id"], "Twilio", None, "Twilio outreach")
    lead_id = str(doc["_id"])

    with as_user(client, cookies):
        response = await client.post(f"/api/autopilot/recruiter-leads/{lead_id}/add-to-watchlist")

    assert response.status_code == 404


async def test_add_to_watchlist_returns_409_for_already_actioned_lead(client, test_user):
    user, cookies = test_user
    doc = await create_recruiter_lead(user["id"], "Datadog", None, "Datadog outreach")
    lead_id = str(doc["_id"])

    with as_user(client, cookies):
        await client.post(f"/api/autopilot/recruiter-leads/{lead_id}/add-to-watchlist")
        response = await client.post(f"/api/autopilot/recruiter-leads/{lead_id}/add-to-watchlist")

    assert response.status_code == 409


# ---------------------------------------------------------------------------
# API: POST /api/autopilot/recruiter-leads/{id}/dismiss
# ---------------------------------------------------------------------------


async def test_dismiss_lead_marks_dismissed(client, test_user):
    user, cookies = test_user
    doc = await create_recruiter_lead(user["id"], "Robinhood", None, "Robinhood outreach")
    lead_id = str(doc["_id"])

    with as_user(client, cookies):
        response = await client.post(f"/api/autopilot/recruiter-leads/{lead_id}/dismiss")

    assert response.status_code == 200
    updated = await get_recruiter_lead(user["id"], lead_id)
    assert updated["status"] == "dismissed"


async def test_dismiss_lead_returns_404_for_other_user(client, test_user, other_user):
    other, _ = other_user
    user, cookies = test_user
    doc = await create_recruiter_lead(other["id"], "Square", None, "Square outreach")
    lead_id = str(doc["_id"])

    with as_user(client, cookies):
        response = await client.post(f"/api/autopilot/recruiter-leads/{lead_id}/dismiss")

    assert response.status_code == 404


async def test_dismiss_lead_returns_409_if_not_pending(client, test_user):
    user, cookies = test_user
    doc = await create_recruiter_lead(user["id"], "Palantir", None, "Palantir outreach")
    lead_id = str(doc["_id"])

    with as_user(client, cookies):
        await client.post(f"/api/autopilot/recruiter-leads/{lead_id}/dismiss")
        response = await client.post(f"/api/autopilot/recruiter-leads/{lead_id}/dismiss")

    assert response.status_code == 409
