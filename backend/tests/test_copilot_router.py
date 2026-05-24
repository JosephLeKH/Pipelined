"""HTTP and unit tests for co-pilot chat."""

from unittest.mock import patch

import pytest

import copilot.router as copilot_router
from copilot.service import parse_copilot_actions
from tests.conftest import as_anonymous, as_user

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_parse_copilot_actions_open_app_only():
    text = (
        "Review your pipeline today. "
        '{"action": "open_app", "path": "/today", "label": "Open Today"} '
        '{"action": "send_email", "to": "recruiter@example.com"}'
    )

    actions = parse_copilot_actions(text)

    assert len(actions) == 1
    assert actions[0] == {
        "action": "open_app",
        "path": "/today",
        "label": "Open Today",
    }


async def test_copilot_chat_unauthenticated(client):
    with as_anonymous(client):
        response = await client.post(
            "/api/copilot/chat",
            json={"message": "What should I do today?"},
        )

    assert response.status_code == 401


async def test_copilot_chat_streams_done_event(client, test_user, monkeypatch):
    monkeypatch.setattr("copilot.router.agent_llm_configured", lambda: True)

    async def fake_stream(user_id, body):  # noqa: ARG001
        yield {"type": "token", "content": "Hello"}
        yield {
            "type": "done",
            "content": "Hello",
            "actions": [{"action": "open_app", "path": "/today", "label": "Today"}],
        }

    with patch("copilot.router.copilot_service.stream_copilot_reply", fake_stream):
        _, cookies = test_user
        with as_user(client, cookies):
            response = await client.post(
                "/api/copilot/chat",
                json={"message": "What should I focus on?"},
            )

    assert response.status_code == 200
    assert "text/event-stream" in response.headers.get("content-type", "")
    body = response.text
    assert "event: token" in body
    assert "event: done" in body
    assert "/today" in body


async def test_copilot_chat_logs_audit_metadata(client, test_user, monkeypatch):
    monkeypatch.setattr("copilot.router.agent_llm_configured", lambda: True)

    async def fake_stream(user_id, body):  # noqa: ARG001
        yield {"type": "done", "content": "Done", "actions": []}

    with patch("copilot.router.copilot_service.stream_copilot_reply", fake_stream):
        with patch.object(copilot_router.logger, "info") as mock_info:
            user, cookies = test_user
            with as_user(client, cookies):
                response = await client.post(
                    "/api/copilot/chat",
                    json={
                        "message": "What should I focus on today?",
                        "history": [
                            {"role": "user", "content": "Hello"},
                            {"role": "assistant", "content": "Hi there"},
                        ],
                    },
                )

    assert response.status_code == 200
    mock_info.assert_any_call(
        "copilot_chat_request",
        user_id=user["id"],
        message_length=len("What should I focus on today?"),
        history_length=2,
    )
    for call in mock_info.call_args_list:
        kwargs = call.kwargs if call.kwargs else {}
        assert "message" not in kwargs
        assert "content" not in kwargs


async def test_copilot_chat_returns_503_when_ai_not_configured(client, test_user, monkeypatch):
    monkeypatch.setattr("copilot.router.agent_llm_configured", lambda: False)

    _, cookies = test_user
    with as_user(client, cookies):
        response = await client.post(
            "/api/copilot/chat",
            json={"message": "Help me prioritize"},
        )

    assert response.status_code == 503
