"""Tests for applications service: CRUD, duplicate guard, and stage logic."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from bson import ObjectId

from applications.schemas import ApplicationCreate, ApplicationListQuery, ApplicationUpdate
from applications.service import (
    ApplicationNotFoundError,
    DuplicateApplicationError,
    _build_filter,
    create,
    delete,
    get,
    list_applications,
    update,
)
from applications.service_ai import _apply_openai_fallback, _score_and_update
from applications.service_analytics import compute_stats
from applications.service_constants import INITIAL_STAGE
from auth.service import create_user

pytestmark = pytest.mark.asyncio(loop_scope="session")

# ---------------------------------------------------------------------------
# Pure-function tests (no MongoDB required)
# ---------------------------------------------------------------------------


def test_duplicate_application_error_stores_existing_id():
    # Arrange / Act
    err = DuplicateApplicationError("abc123")

    # Assert
    assert err.existing_id == "abc123"


def test_application_not_found_error_is_exception():
    # Act / Assert
    assert issubclass(ApplicationNotFoundError, Exception)


def test_build_filter_always_includes_user_id():
    # Arrange
    uid = ObjectId()
    query = ApplicationListQuery()

    # Act
    f = _build_filter(uid, query)

    # Assert
    assert f["user_id"] == uid


def test_build_filter_applies_stage_filter_when_set():
    # Arrange
    uid = ObjectId()
    query = ApplicationListQuery(stage="Onsite")

    # Act
    f = _build_filter(uid, query)

    # Assert
    assert f["current_stage"] == "Onsite"


def test_build_filter_applies_cursor_descending():
    # Arrange
    uid = ObjectId()
    cursor_id = str(ObjectId())
    query = ApplicationListQuery(cursor=cursor_id, sort_order="desc")

    # Act
    f = _build_filter(uid, query)

    # Assert
    assert "$lt" in f["_id"]
    assert f["_id"]["$lt"] == ObjectId(cursor_id)


def test_build_filter_applies_cursor_ascending():
    # Arrange
    uid = ObjectId()
    cursor_id = str(ObjectId())
    query = ApplicationListQuery(cursor=cursor_id, sort_order="asc")

    # Act
    f = _build_filter(uid, query)

    # Assert
    assert "$gt" in f["_id"]


def test_build_filter_applies_date_range_when_both_set():
    # Arrange
    uid = ObjectId()
    dt_from = datetime(2024, 1, 1, tzinfo=timezone.utc)
    dt_to = datetime(2024, 6, 1, tzinfo=timezone.utc)
    query = ApplicationListQuery(date_from=dt_from, date_to=dt_to)

    # Act
    f = _build_filter(uid, query)

    # Assert
    assert f["date_applied"]["$gte"] == dt_from
    assert f["date_applied"]["$lte"] == dt_to


# ---------------------------------------------------------------------------
# Integration tests (require live MongoDB — app fixture triggers connect())
# ---------------------------------------------------------------------------


async def test_create_application_initializes_stage_and_history(app):
    # Arrange
    user = await create_user("svc@example.com", "TestPass123!", "SVC User")
    user_id = str(user["_id"])
    body = ApplicationCreate(role_title="SWE", company="Acme", source="manual")

    # Act
    doc = await create(user_id, body)

    # Assert
    assert doc["current_stage"] == INITIAL_STAGE
    assert len(doc["stage_history"]) == 1
    assert doc["stage_history"][0]["stage"] == INITIAL_STAGE
    assert isinstance(doc["stage_history"][0]["transitioned_at"], datetime)
    assert doc["stages"] == user["default_stages"]
    assert doc["user_id"] == ObjectId(user_id)


async def test_create_application_raises_duplicate_error_on_same_company_role(app):
    # Arrange
    user = await create_user("dup@example.com", "TestPass123!", "Dup User")
    user_id = str(user["_id"])
    body = ApplicationCreate(role_title="SWE", company="Acme", source="manual")
    await create(user_id, body)

    # Act / Assert
    with pytest.raises(DuplicateApplicationError) as exc_info:
        await create(user_id, body)

    assert exc_info.value.existing_id is not None


async def test_list_applications_returns_docs_scoped_to_user(app):
    # Arrange
    user_a = await create_user("a@example.com", "TestPass123!", "User A")
    user_b = await create_user("b@example.com", "TestPass123!", "User B")
    await create(str(user_a["_id"]), ApplicationCreate(role_title="SWE", company="Acme", source="manual"))
    await create(str(user_b["_id"]), ApplicationCreate(role_title="PM", company="Beta", source="manual"))

    # Act
    docs, next_cursor = await list_applications(str(user_a["_id"]), ApplicationListQuery())

    # Assert
    assert len(docs) == 1
    assert docs[0]["company"] == "Acme"
    assert next_cursor is None


async def test_list_applications_returns_next_cursor_when_more_pages_exist(app):
    # Arrange
    user = await create_user("page@example.com", "TestPass123!", "Page User")
    uid = str(user["_id"])
    for i in range(3):
        await create(uid, ApplicationCreate(role_title=f"Role{i}", company="Corp", source="manual"))

    # Act
    docs, next_cursor = await list_applications(uid, ApplicationListQuery(limit=2))

    # Assert
    assert len(docs) == 2
    assert next_cursor is not None


async def test_get_application_returns_full_doc(app):
    # Arrange
    user = await create_user("get@example.com", "TestPass123!", "Get User")
    uid = str(user["_id"])
    doc = await create(uid, ApplicationCreate(role_title="SWE", company="Acme", source="manual"))

    # Act
    result = await get(uid, str(doc["_id"]))

    # Assert
    assert result is not None
    assert str(result["_id"]) == str(doc["_id"])
    assert "stage_history" in result


async def test_get_application_returns_none_for_wrong_user(app):
    # Arrange
    user_a = await create_user("owner@example.com", "TestPass123!", "Owner")
    user_b = await create_user("other@example.com", "TestPass123!", "Other")
    doc = await create(str(user_a["_id"]), ApplicationCreate(role_title="SWE", company="Acme", source="manual"))

    # Act
    result = await get(str(user_b["_id"]), str(doc["_id"]))

    # Assert
    assert result is None


async def test_update_application_appends_stage_history_on_stage_change(app):
    # Arrange
    user = await create_user("upd@example.com", "TestPass123!", "Upd User")
    uid = str(user["_id"])
    doc = await create(uid, ApplicationCreate(role_title="SWE", company="Acme", source="manual"))

    # Act
    updated = await update(uid, str(doc["_id"]), ApplicationUpdate(current_stage="Onsite"))

    # Assert
    assert updated is not None
    assert updated["current_stage"] == "Onsite"
    assert len(updated["stage_history"]) == 2
    assert updated["stage_history"][-1]["stage"] == "Onsite"


async def test_update_application_without_stage_change_does_not_append_history(app):
    # Arrange
    user = await create_user("nochange@example.com", "TestPass123!", "No Change")
    uid = str(user["_id"])
    doc = await create(uid, ApplicationCreate(role_title="SWE", company="Acme", source="manual"))

    # Act
    updated = await update(uid, str(doc["_id"]), ApplicationUpdate(compensation="$100k"))

    # Assert
    assert updated is not None
    assert len(updated["stage_history"]) == 1


async def test_delete_application_removes_doc_and_returns_true(app):
    # Arrange
    user = await create_user("del@example.com", "TestPass123!", "Del User")
    uid = str(user["_id"])
    doc = await create(uid, ApplicationCreate(role_title="SWE", company="Acme", source="manual"))

    # Act
    deleted = await delete(uid, str(doc["_id"]))

    # Assert
    assert deleted is True
    assert await get(uid, str(doc["_id"])) is None


async def test_delete_application_returns_false_for_missing_id(app):
    # Arrange
    user = await create_user("miss@example.com", "TestPass123!", "Miss User")
    uid = str(user["_id"])

    # Act
    result = await delete(uid, str(ObjectId()))

    # Assert
    assert result is False


async def test_compute_stats_returns_correct_totals(app):
    # Arrange
    user = await create_user("stats@example.com", "TestPass123!", "Stats User")
    uid = str(user["_id"])
    await create(uid, ApplicationCreate(role_title="SWE", company="Alpha", source="manual"))
    await create(uid, ApplicationCreate(role_title="PM", company="Beta", source="manual"))
    doc = await create(uid, ApplicationCreate(role_title="DS", company="Gamma", source="manual"))
    # Advance one to a response stage to generate history
    await update(uid, str(doc["_id"]), ApplicationUpdate(current_stage="Phone Screen"))

    # Act
    stats = await compute_stats(uid)

    # Assert
    assert stats["total_applied"] == 3
    assert stats["active_count"] == 3
    assert stats["response_rate"] == round(1 / 3, 2)


# ---------------------------------------------------------------------------
# OpenAI fallback tests (pure-function, no MongoDB required)
# ---------------------------------------------------------------------------


async def test_apply_openai_fallback_fills_role_title_and_company():
    # Arrange
    body = ApplicationCreate(role_title=None, company=None, source="extension", page_text="Software Engineer at Acme")
    openai_result = {
        "role_title": "Software Engineer",
        "company_name": "Acme Corp",
        "compensation": None,
        "company_type": None,
        "location": None,
        "remote_status": None,
    }

    with patch("applications.service_ai.parse_with_openai", AsyncMock(return_value=openai_result)):
        # Act
        result, enhanced = await _apply_openai_fallback(body)

    # Assert
    assert enhanced is True
    assert result.role_title == "Software Engineer"
    assert result.company == "Acme Corp"


async def test_apply_openai_fallback_returns_body_unchanged_when_no_page_text():
    # Arrange
    body = ApplicationCreate(role_title=None, company=None, source="extension", page_text=None)

    # Act
    result, enhanced = await _apply_openai_fallback(body)

    # Assert
    assert enhanced is False
    assert result is body


async def test_apply_openai_fallback_returns_body_unchanged_on_parse_failure():
    # Arrange
    body = ApplicationCreate(role_title=None, company=None, source="extension", page_text="some text")

    with patch("applications.service_ai.parse_with_openai", AsyncMock(side_effect=Exception("network error"))):
        # Act
        result, enhanced = await _apply_openai_fallback(body)

    # Assert
    assert enhanced is False
    assert result is body


async def test_create_extension_application_triggers_openai_fallback_when_fields_missing(app):
    # Arrange
    user = await create_user("wd@example.com", "TestPass123!", "WD User")
    user_id = str(user["_id"])
    openai_result = {
        "role_title": "SWE Intern",
        "company_name": "Workday Inc",
        "compensation": None,
        "company_type": None,
        "location": None,
        "remote_status": None,
    }
    body = ApplicationCreate(
        role_title=None,
        company=None,
        source="extension",
        page_text="SWE Intern at Workday Inc",
    )

    with patch("applications.service_ai.parse_with_openai", AsyncMock(return_value=openai_result)):
        # Act
        doc = await create(user_id, body)

    # Assert
    assert doc["role_title"] == "SWE Intern"
    assert doc["company"] == "Workday Inc"
    assert "page_text" not in doc


async def test_create_extension_application_saves_partial_data_when_openai_fails(app):
    # Arrange
    user = await create_user("wd2@example.com", "TestPass123!", "WD2 User")
    user_id = str(user["_id"])
    body = ApplicationCreate(
        role_title=None,
        company=None,
        source="extension",
        page_text="some unstructured text",
    )

    with patch("applications.service_ai.parse_with_openai", AsyncMock(side_effect=Exception("api down"))):
        # Act
        doc = await create(user_id, body)

    # Assert — application is saved with whatever partial data exists (nulls OK)
    assert "page_text" not in doc
    assert doc["source"] == "extension"


async def test_score_update_rejects_wrong_user(app):
    # Arrange — create an application as user A
    user_a = await create_user("score_a@example.com", "TestPass123!", "Score A")
    user_b = await create_user("score_b@example.com", "TestPass123!", "Score B")
    user_a_id = str(user_a["_id"])
    user_b_id = str(user_b["_id"])

    app_doc = await create(user_a_id, ApplicationCreate(role_title="Analyst", company="Firm", source="manual"))
    app_id = str(app_doc["_id"])

    mock_result = {"fit_score": 88, "summary": "great fit"}
    with patch("applications.service_ai.score_fit", AsyncMock(return_value=mock_result)):
        # Act — call _score_and_update with user B's id (wrong user)
        await _score_and_update(app_id, user_b_id, "resume text", "job description")

    # Assert — ai_analysis should NOT be set on the application
    from database import get_collection  # noqa: PLC0415
    stored = await get_collection("applications").find_one({"_id": app_doc["_id"]})
    assert stored is not None
    assert stored.get("ai_analysis") is None
