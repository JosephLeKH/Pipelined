"""Tests for agent run logging helper."""

from datetime import datetime

import pytest
from bson import ObjectId

from ai.agent_log import (
    AGENT_TYPE_FIT,
    COLLECTION_NAME,
    STATUS_SUCCESS,
    log_agent_run,
)
from database import get_collection

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_log_agent_run_persists_user_scoped_record(test_user):
    user, _ = test_user
    user_id = user["id"]

    await log_agent_run(
        user_id,
        AGENT_TYPE_FIT,
        STATUS_SUCCESS,
        "Fit score 82: Strong Python overlap",
        application_id="507f1f77bcf86cd799439011",
    )

    doc = await get_collection(COLLECTION_NAME).find_one({"user_id": ObjectId(user_id)})
    assert doc is not None
    assert doc["agent_type"] == AGENT_TYPE_FIT
    assert doc["status"] == STATUS_SUCCESS
    assert "Strong Python" in doc["summary"]
    assert doc["application_id"] == ObjectId("507f1f77bcf86cd799439011")
    assert isinstance(doc["created_at"], datetime)


async def test_log_agent_run_omits_application_id_when_not_provided(test_user):
    user, _ = test_user
    user_id = user["id"]

    await log_agent_run(user_id, AGENT_TYPE_FIT, STATUS_SUCCESS, "Brief summary")

    doc = await get_collection(COLLECTION_NAME).find_one(
        {"user_id": ObjectId(user_id), "summary": "Brief summary"}
    )
    assert doc is not None
    assert doc["user_id"] == ObjectId(user_id)
    assert "application_id" not in doc
