"""Unit tests for co-pilot context builder."""

import datetime as dt

import pytest
from bson import ObjectId

from ai.copilot_context import (
    MAX_CONTEXT_CHARS,
    build_copilot_context,
    estimate_tokens,
    truncate_context,
)
import database

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_estimate_tokens_and_truncate():
    text = "a" * (MAX_CONTEXT_CHARS + 100)

    assert estimate_tokens("hello world") >= 1
    trimmed = truncate_context(text)

    assert len(trimmed) <= MAX_CONTEXT_CHARS
    assert trimmed.endswith("[context truncated]")


async def test_build_copilot_context_scopes_by_user_id(test_user):
    user, _ = test_user
    user_oid = ObjectId(user["id"])
    other_oid = ObjectId()

    await database.get_collection("applications").insert_many([
        {
            "user_id": user_oid,
            "company": "Acme",
            "role_title": "Backend Engineer",
            "current_stage": "Applied",
            "date_applied": dt.datetime.now(dt.timezone.utc),
            "updated_at": dt.datetime.now(dt.timezone.utc),
        },
        {
            "user_id": other_oid,
            "company": "Secret Co",
            "role_title": "Hidden Role",
            "current_stage": "Applied",
            "date_applied": dt.datetime.now(dt.timezone.utc),
            "updated_at": dt.datetime.now(dt.timezone.utc),
        },
    ])

    context = await build_copilot_context(user["id"])

    assert "Backend Engineer @ Acme" in context
    assert "Hidden Role" not in context
    assert "Target roles" in context


async def test_build_copilot_context_includes_agent_profile(test_user):
    user, _ = test_user
    await database.get_collection("users").update_one(
        {"_id": ObjectId(user["id"])},
        {"$set": {"agent_profile": {"career_goals": "Staff engineer path", "target_roles": ["Staff"]}}},
    )

    context = await build_copilot_context(user["id"])

    assert "Staff engineer path" in context
    assert "Staff" in context
