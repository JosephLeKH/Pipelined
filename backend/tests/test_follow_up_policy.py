"""Guardrails: follow-up drafts are never auto-sent via Gmail."""

import inspect
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from bson import ObjectId
from datetime import datetime, timedelta, timezone

import database
import email_integration.service as email_service_module
from email_integration.service import sync_emails
from notifications.notification_service import (
    _generate_follow_up_due_notifications,
    generate_notifications,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
EMAIL_INTEGRATION_DIR = REPO_ROOT / "backend" / "email_integration"

GMAIL_SEND_PATTERNS = ("messages.send", "send_email", "gmail.users().messages().send")


def test_email_integration_has_no_gmail_send_code():
    """email_integration must not implement Gmail outbound send."""
    findings: list[str] = []
    for path in EMAIL_INTEGRATION_DIR.rglob("*.py"):
        text = path.read_text(encoding="utf-8")
        for pattern in GMAIL_SEND_PATTERNS:
            if pattern in text:
                findings.append(f"{path.relative_to(REPO_ROOT)}: {pattern}")
    assert findings == [], f"Gmail send patterns found: {findings}"


@pytest.mark.asyncio(loop_scope="session")
async def test_sync_emails_does_not_call_send_functions(test_user):
    """sync_emails ingests mail only — no outbound send helpers invoked."""
    user_id = test_user[0]["id"]
    users_col = database.get_collection("users")
    await users_col.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "gmail_access_token": "tok",
            "gmail_refresh_token": "ref",
            "gmail_email": "sync@test.com",
        }},
    )
    user = await users_col.find_one({"_id": ObjectId(user_id)})

    mock_list_resp = MagicMock()
    mock_list_resp.status_code = 200
    mock_list_resp.json.return_value = {"messages": []}
    mock_client = AsyncMock()
    mock_client.__aenter__.return_value.get = AsyncMock(return_value=mock_list_resp)

    with (
        patch("httpx.AsyncClient", return_value=mock_client),
        patch("email_integration.service._get_valid_access_token", return_value="tok"),
        patch("notifications.email_service.email_service.send_text_email", new_callable=AsyncMock) as mock_send,
    ):
        await sync_emails(user)

    mock_send.assert_not_called()
    sync_source = inspect.getsource(email_service_module.sync_emails)
    assert "send_text_email" not in sync_source
    assert "messages.send" not in sync_source


@pytest.mark.asyncio(loop_scope="session")
async def test_generate_notifications_does_not_call_send_functions(test_user):
    """Batch notification jobs create in-app alerts only — no email send."""
    with patch(
        "notifications.email_service.email_service.send_text_email",
        new_callable=AsyncMock,
    ) as mock_send:
        await generate_notifications()

    mock_send.assert_not_called()


@pytest.mark.asyncio(loop_scope="session")
async def test_follow_up_due_notifications_do_not_call_send_functions(test_user):
    """Follow-up due notifications are in-app only."""
    user_id_obj = ObjectId(test_user[0]["id"])
    apps_col = database.get_collection("applications")

    await apps_col.insert_one({
        "user_id": user_id_obj,
        "company": "NoSend Co",
        "role_title": "Engineer",
        "archived": False,
        "follow_up_date": datetime.now(timezone.utc) - timedelta(days=1),
    })

    with patch(
        "notifications.email_service.email_service.send_text_email",
        new_callable=AsyncMock,
    ) as mock_send:
        await _generate_follow_up_due_notifications()

    mock_send.assert_not_called()
