"""Cross-user isolation tests for agent-related collections and endpoints."""

import datetime as dt

import pytest
from bson import ObjectId

import database
from ai.agent_log import AGENT_TYPE_BRIEF, AGENT_TYPE_FIT, STATUS_SUCCESS, log_agent_run
from applications.interview_prep import mock_interview as mi
from applications.interview_prep.constants import MOCK_INTERVIEW_DAILY_SESSION_LIMIT
from email_integration.email_events import EMAIL_EVENTS_COLLECTION
from tests.conftest import as_user, verify_user_by_id

pytestmark = pytest.mark.asyncio(loop_scope="session")

_FOLLOW_UP_DATE = dt.datetime.combine(
    dt.date.today() - dt.timedelta(days=2),
    dt.time.min,
    tzinfo=dt.timezone.utc,
)


async def _register_user(client, email: str, display_name: str) -> tuple[dict, dict]:
    resp = await client.post("/api/auth/register", json={
        "email": email,
        "password": "TestPass123!",
        "display_name": display_name,
    })
    assert resp.status_code == 201
    user = resp.json()["data"]
    await verify_user_by_id(user["id"])
    cookies = dict(resp.cookies)
    return user, cookies


async def _insert_follow_up_app(user_id: str, company: str) -> str:
    result = await database.get_collection("applications").insert_one({
        "user_id": ObjectId(user_id),
        "company": company,
        "role_title": "Engineer",
        "archived": False,
        "follow_up_date": _FOLLOW_UP_DATE,
        "updated_at": dt.datetime.now(dt.timezone.utc),
        "created_at": dt.datetime.now(dt.timezone.utc),
    })
    return str(result.inserted_id)


async def test_mission_snooze_isolated_between_users(client):
    user_a, cookies_a = await _register_user(client, "mission_a@example.com", "Mission A")
    user_b, cookies_b = await _register_user(client, "mission_b@example.com", "Mission B")
    app_a_id = await _insert_follow_up_app(user_a["id"], "Acme")
    app_b_id = await _insert_follow_up_app(user_b["id"], "Beta")

    with as_user(client, cookies_a):
        brief_a = await client.get("/api/brief/today")
    assert brief_a.status_code == 200
    mission_a = brief_a.json()["data"]["missions"][0]["id"]
    assert mission_a == app_a_id

    with as_user(client, cookies_a):
        snooze_resp = await client.post(f"/api/brief/missions/{mission_a}/snooze", json={})
    assert snooze_resp.status_code == 200

    with as_user(client, cookies_b):
        brief_b = await client.get("/api/brief/today")
    assert brief_b.status_code == 200
    active_b = [m["id"] for m in brief_b.json()["data"]["missions"]]
    assert app_b_id in active_b

    with as_user(client, cookies_b):
        cross_snooze = await client.post(f"/api/brief/missions/{app_a_id}/snooze", json={})
    assert cross_snooze.status_code == 200

    with as_user(client, cookies_a):
        brief_a_after = await client.get("/api/brief/today")
    active_a = [m["id"] for m in brief_a_after.json()["data"]["missions"]]
    assert mission_a not in active_a


async def test_mock_interview_quota_isolated_per_user(test_user, other_user):
    user_a, _ = test_user
    user_b, _ = other_user
    today = await mi._local_date_for_user(user_a["id"])
    col = database.get_collection(mi.MOCK_INTERVIEW_QUOTA_COLLECTION)

    await col.update_one(
        {"user_id": ObjectId(user_a["id"]), "date": today},
        {"$set": {"sessions": MOCK_INTERVIEW_DAILY_SESSION_LIMIT}},
        upsert=True,
    )

    with pytest.raises(mi.MockInterviewLimitError):
        await mi._check_daily_session_quota(user_a["id"], is_new_session=True)

    await mi._check_daily_session_quota(user_b["id"], is_new_session=True)


async def test_email_events_api_isolated_between_users(client, test_user, other_user):
    user_a, cookies_a = test_user
    _, cookies_b = other_user

    result = await database.get_collection("applications").insert_one({
        "user_id": ObjectId(user_a["id"]),
        "company": "Private Co",
        "role_title": "Engineer",
        "source": "email",
        "current_stage": "Interviewing",
    })
    app_id = str(result.inserted_id)

    now = dt.datetime.now(dt.timezone.utc)
    await database.get_collection(EMAIL_EVENTS_COLLECTION).insert_one({
        "user_id": ObjectId(user_a["id"]),
        "type": "stage_updated",
        "timestamp": now,
        "application_id": app_id,
        "company": "Private Co",
        "role_title": "Engineer",
        "stage": "Interviewing",
        "subject": "Interview scheduled",
    })

    with as_user(client, cookies_a):
        own_resp = await client.get(f"/api/applications/{app_id}/email-events")
    assert own_resp.status_code == 200
    assert len(own_resp.json()["data"]) == 1

    with as_user(client, cookies_b):
        cross_resp = await client.get(f"/api/applications/{app_id}/email-events")
    assert cross_resp.status_code == 404


async def test_agent_activity_scoped_to_authenticated_user(client, test_user, other_user):
    user_a, cookies_a = test_user
    user_b, cookies_b = other_user

    await log_agent_run(user_a["id"], AGENT_TYPE_FIT, STATUS_SUCCESS, "User A fit score")
    await log_agent_run(user_a["id"], AGENT_TYPE_BRIEF, STATUS_SUCCESS, "User A brief")
    await log_agent_run(user_b["id"], AGENT_TYPE_FIT, STATUS_SUCCESS, "User B fit score")

    with as_user(client, cookies_a):
        resp_a = await client.get("/api/agent/activity")
    assert resp_a.status_code == 200
    summaries_a = [entry["summary"] for entry in resp_a.json()["data"]]
    assert len(summaries_a) == 2
    assert "User B fit score" not in summaries_a

    with as_user(client, cookies_b):
        resp_b = await client.get("/api/agent/activity")
    assert resp_b.status_code == 200
    summaries_b = [entry["summary"] for entry in resp_b.json()["data"]]
    assert len(summaries_b) == 1
    assert summaries_b[0] == "User B fit score"
