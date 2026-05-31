"""Tests for mock interview SSE endpoint and turn limits."""

from datetime import UTC, datetime
from unittest.mock import patch

import pytest
from bson import ObjectId

import database

from applications.interview_prep.mock_interview import _count_user_turns
from applications.interview_prep.schemas import MockInterviewMessage, MockInterviewRequest
from tests.conftest import as_anonymous, as_user

pytestmark = pytest.mark.asyncio(loop_scope="session")

_UNAUTH_APP_ID = "507f1f77bcf86cd799439011"


def test_count_user_turns_includes_current_message():
    body = MockInterviewRequest(
        message="My answer",
        history=[
            MockInterviewMessage(role="assistant", content="Tell me about yourself."),
            MockInterviewMessage(role="user", content="I built APIs."),
        ],
    )

    assert _count_user_turns(body) == 2


def test_count_user_turns_end_session_uses_history_only():
    body = MockInterviewRequest(
        message="ignored",
        end_session=True,
        history=[
            MockInterviewMessage(role="assistant", content="Question"),
            MockInterviewMessage(role="user", content="Answer"),
        ],
    )

    assert _count_user_turns(body) == 1


async def test_mock_interview_unauthenticated(client):
    with as_anonymous(client):
        response = await client.post(
            f"/api/applications/{_UNAUTH_APP_ID}/mock-interview",
            json={"message": "Hello"},
        )

    assert response.status_code == 401


async def test_mock_interview_returns_503_when_ai_not_configured(client, test_user, monkeypatch):
    monkeypatch.setattr("applications.interview_prep.router.agent_llm_configured", lambda: False)

    _, cookies = test_user
    with as_user(client, cookies):
        create_resp = await client.post("/api/applications", json={
            "role_title": "Engineer",
            "company": "Acme",
            "source": "manual",
        })
        app_id = create_resp.json()["data"]["id"]
        response = await client.post(
            f"/api/applications/{app_id}/mock-interview",
            json={"message": ""},
        )

    assert response.status_code == 503


async def test_mock_interview_streams_done_event(client, test_user, monkeypatch):
    monkeypatch.setattr("applications.interview_prep.router.agent_llm_configured", lambda: True)

    async def fake_stream(user_id, app_doc, resume_text, body):  # noqa: ARG001
        yield {"type": "token", "content": "Tell me "}
        yield {"type": "token", "content": "about a project."}
        yield {
            "type": "done",
            "content": "Tell me about a project.",
            "turn_count": 0,
            "is_debrief": False,
        }

    with patch("applications.interview_prep.router.stream_mock_interview", fake_stream):
        _, cookies = test_user
        with as_user(client, cookies):
            create_resp = await client.post("/api/applications", json={
                "role_title": "Engineer",
                "company": "Acme",
                "source": "manual",
            })
            app_id = create_resp.json()["data"]["id"]
            response = await client.post(
                f"/api/applications/{app_id}/mock-interview",
                json={"message": ""},
            )

    assert response.status_code == 200
    assert "text/event-stream" in response.headers.get("content-type", "")
    assert "event: token" in response.text
    assert "event: done" in response.text


async def test_mock_interview_rejects_turn_limit(client, test_user, monkeypatch):
    monkeypatch.setattr("applications.interview_prep.router.agent_llm_configured", lambda: True)

    async def limit_stream(user_id, app_doc, resume_text, body):  # noqa: ARG001
        yield {
            "type": "error",
            "message": "Maximum 10 turns reached for this session.",
        }

    with patch("applications.interview_prep.router.stream_mock_interview", limit_stream):
        _, cookies = test_user
        with as_user(client, cookies):
            create_resp = await client.post("/api/applications", json={
                "role_title": "Engineer",
                "company": "Acme",
                "source": "manual",
            })
            app_id = create_resp.json()["data"]["id"]
            response = await client.post(
                f"/api/applications/{app_id}/mock-interview",
                json={"message": "Answer"},
            )

    assert response.status_code == 200
    assert "Maximum 10 turns" in response.text


async def test_mock_interview_quota_uses_user_local_date(test_user):
    from applications.interview_prep import mock_interview as mi

    user, _ = test_user
    user_id = user["id"]
    await database.get_collection("users").update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"timezone": "Pacific/Kiritimati"}},
    )

    with patch.object(mi, "datetime") as mock_dt:
        mock_dt.now.return_value = datetime(2026, 5, 24, 10, 0, tzinfo=UTC)
        mock_dt.UTC = UTC
        local_date = await mi._local_date_for_user(user_id)

    assert local_date == "2026-05-25"


async def test_mock_interview_daily_quota_is_atomic(test_user):
    from applications.interview_prep import mock_interview as mi
    from applications.interview_prep.constants import MOCK_INTERVIEW_DAILY_SESSION_LIMIT

    user, _ = test_user
    user_id = user["id"]
    today = await mi._local_date_for_user(user_id)
    col = database.get_collection(mi.MOCK_INTERVIEW_QUOTA_COLLECTION)
    await col.update_one(
        {"user_id": ObjectId(user_id), "date": today},
        {"$set": {"sessions": MOCK_INTERVIEW_DAILY_SESSION_LIMIT}},
        upsert=True,
    )
    seeded = await col.find_one({"user_id": ObjectId(user_id), "date": today})
    assert seeded["sessions"] == MOCK_INTERVIEW_DAILY_SESSION_LIMIT

    with pytest.raises(mi.MockInterviewLimitError):
        await mi._check_daily_session_quota(user_id, is_new_session=True)


async def test_mock_interview_quota_exceeded_error_emits_structured_event(client, test_user, monkeypatch):
    """Test that pre-stream QuotaExceededError emits structured error with code/message/retry_after."""
    monkeypatch.setattr("applications.interview_prep.router.agent_llm_configured", lambda: True)

    async def quota_error_stream(user_id, app_doc, resume_text, body):  # noqa: ARG001
        from parsing.ai_cache import QuotaExceededError
        raise QuotaExceededError("quota exceeded")

    with patch("applications.interview_prep.router.stream_mock_interview", quota_error_stream):
        _, cookies = test_user
        with as_user(client, cookies):
            create_resp = await client.post("/api/applications", json={
                "role_title": "Engineer",
                "company": "Acme",
                "source": "manual",
            })
            app_id = create_resp.json()["data"]["id"]
            response = await client.post(
                f"/api/applications/{app_id}/mock-interview",
                json={"message": ""},
            )

    assert response.status_code == 200
    assert "event: error" in response.text
    assert "ai_quota_exceeded" in response.text
    assert "retry_after" in response.text


async def test_mock_interview_debrief_event_emitted_on_end_session(client, test_user, monkeypatch):
    """Test that end-session triggers debrief event type."""
    monkeypatch.setattr("applications.interview_prep.router.agent_llm_configured", lambda: True)

    async def debrief_stream(user_id, app_doc, resume_text, body):  # noqa: ARG001
        if body.end_session:
            yield {
                "type": "token",
                "content": "Strengths: ",
            }
            yield {
                "type": "debrief",
                "content": "Strengths: You communicated well. Areas to improve: Practice on live system.",
                "turn_count": 3,
                "is_debrief": True,
            }
        else:
            yield {
                "type": "done",
                "content": "Question",
                "turn_count": 0,
                "is_debrief": False,
            }

    with patch("applications.interview_prep.router.stream_mock_interview", debrief_stream):
        _, cookies = test_user
        with as_user(client, cookies):
            create_resp = await client.post("/api/applications", json={
                "role_title": "Engineer",
                "company": "Acme",
                "source": "manual",
            })
            app_id = create_resp.json()["data"]["id"]
            response = await client.post(
                f"/api/applications/{app_id}/mock-interview",
                json={"message": "", "end_session": True, "history": []},
            )

    assert response.status_code == 200
    assert "event: debrief" in response.text
    assert "Strengths:" in response.text
