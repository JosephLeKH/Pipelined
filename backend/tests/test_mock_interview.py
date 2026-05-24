"""Tests for mock interview SSE endpoint and turn limits."""

from unittest.mock import patch

import pytest

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
