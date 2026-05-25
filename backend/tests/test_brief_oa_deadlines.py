"""Tests for OA deadline brief section."""

import datetime as dt

import pytest
from bson import ObjectId

import database
from notifications.brief_oa_deadlines import fetch_oa_deadlines, oa_deadline_body
from notifications.morning_brief import build_morning_brief
from tests.conftest import verify_user_by_id

REGISTER_PAYLOAD = {
    "email": "oa_brief@example.com",
    "password": "password123",
    "display_name": "OA Brief User",
}


def test_oa_deadline_body_formats_days_remaining():
    assert oa_deadline_body(3) == "Due in 3 days"
    assert oa_deadline_body(1) == "Due in 1 day"
    assert oa_deadline_body(0) == "Due today"
    assert oa_deadline_body(-2) == "Overdue by 2 days"


@pytest.mark.asyncio(loop_scope="session")
async def test_fetch_oa_deadlines_includes_upcoming(client):
    resp = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    user_id = resp.json()["data"]["id"]
    await verify_user_by_id(user_id)
    uid = ObjectId(user_id)
    today = dt.date.today()
    deadline = dt.datetime.combine(
        today + dt.timedelta(days=3), dt.time(23, 59), tzinfo=dt.timezone.utc,
    )

    await database.get_collection("applications").insert_one({
        "user_id": uid,
        "company": "HackerCo",
        "role_title": "Backend Engineer",
        "current_stage": "OA",
        "archived": False,
        "deleted": False,
        "deadline": deadline,
    })

    items = await fetch_oa_deadlines(uid, today)

    assert len(items) == 1
    assert "HackerCo" in items[0].title
    assert items[0].body == "Due in 3 days"
    assert items[0].entity_id is not None


@pytest.mark.asyncio(loop_scope="session")
async def test_build_morning_brief_includes_oa_deadlines(client):
    resp = await client.post("/api/auth/register", json={
        "email": "oa_brief2@example.com",
        "password": "password123",
        "display_name": "OA Brief User 2",
    })
    user_id = resp.json()["data"]["id"]
    await verify_user_by_id(user_id)
    uid = ObjectId(user_id)
    today = dt.date.today()
    deadline = dt.datetime.combine(
        today + dt.timedelta(days=1), dt.time(23, 59), tzinfo=dt.timezone.utc,
    )

    await database.get_collection("applications").insert_one({
        "user_id": uid,
        "company": "TestCorp",
        "role_title": "SWE",
        "current_stage": "OA",
        "archived": False,
        "deleted": False,
        "deadline": deadline,
    })

    brief = await build_morning_brief(user_id, local_date=today.isoformat())

    assert len(brief.sections.oa_deadlines) == 1
    assert "TestCorp" in brief.sections.oa_deadlines[0].title
