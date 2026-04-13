"""Integration tests for calendar event router endpoints."""

import datetime as dt

import pytest

from database import get_collection
from tests.conftest import verify_user_by_id

pytestmark = pytest.mark.asyncio(loop_scope="session")

APP_PAYLOAD = {
    "role_title": "Software Engineer",
    "company": "Acme Corp",
    "source": "manual",
}

EVENT_DATE = "2026-03-15"
EVENT_PAYLOAD_TEMPLATE = {
    "event_type": "technical",
    "date": EVENT_DATE,
    "title": "Technical Interview",
}


async def _create_app(client, cookies: dict) -> str:
    """Helper: create an application and return its id."""
    resp = await client.post("/api/applications", json=APP_PAYLOAD, cookies=cookies)
    return resp.json()["data"]["id"]


async def _create_event(client, cookies: dict, app_id: str, overrides: dict | None = None) -> dict:
    """Helper: create a calendar event and return the response body."""
    payload = {**EVENT_PAYLOAD_TEMPLATE, "application_id": app_id, **(overrides or {})}
    resp = await client.post("/api/calendar/events", json=payload, cookies=cookies)
    return resp.json()


# ---------------------------------------------------------------------------
# POST /api/calendar/events
# ---------------------------------------------------------------------------


async def test_create_event_returns_201(client, test_user):
    # Arrange
    _, cookies = test_user
    app_id = await _create_app(client, cookies)

    # Act
    resp = await client.post(
        "/api/calendar/events",
        json={**EVENT_PAYLOAD_TEMPLATE, "application_id": app_id},
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["event_type"] == "technical"
    assert data["date"] == EVENT_DATE
    assert data["title"] == "Technical Interview"
    assert data["company"] == "Acme Corp"
    assert data["role_title"] == "Software Engineer"
    assert "id" in data


async def test_create_event_returns_404_for_unknown_application(client, test_user):
    # Arrange
    _, cookies = test_user
    fake_app_id = "000000000000000000000001"

    # Act
    resp = await client.post(
        "/api/calendar/events",
        json={**EVENT_PAYLOAD_TEMPLATE, "application_id": fake_app_id},
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 404
    assert resp.json()["detail"]["code"] == "APP_NOT_FOUND"


async def test_create_event_returns_404_for_other_users_application(client):
    # Arrange — two users
    resp_a = await client.post(
        "/api/auth/register",
        json={"email": "owner@test.com", "password": "TestPass123!", "display_name": "Owner"},
    )
    cookies_a = dict(resp_a.cookies)
    await verify_user_by_id(resp_a.json()["data"]["id"])

    resp_b = await client.post(
        "/api/auth/register",
        json={"email": "other@test.com", "password": "TestPass123!", "display_name": "Other"},
    )
    cookies_b = dict(resp_b.cookies)
    await verify_user_by_id(resp_b.json()["data"]["id"])

    app_id = await _create_app(client, cookies_a)

    # Act — user B tries to create event for user A's application
    resp = await client.post(
        "/api/calendar/events",
        json={**EVENT_PAYLOAD_TEMPLATE, "application_id": app_id},
        cookies=cookies_b,
    )

    # Assert
    assert resp.status_code == 404


async def test_create_event_returns_401_without_auth(client, test_user):
    # Arrange
    _, cookies = test_user
    app_id = await _create_app(client, cookies)

    # Act
    resp = await client.post(
        "/api/calendar/events",
        json={**EVENT_PAYLOAD_TEMPLATE, "application_id": app_id},
    )

    # Assert
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/calendar/events
# ---------------------------------------------------------------------------


async def test_list_events_returns_events_for_date_range(client, test_user):
    # Arrange
    _, cookies = test_user
    app_id = await _create_app(client, cookies)
    await _create_event(client, cookies, app_id)

    # Act
    resp = await client.get(
        "/api/calendar/events",
        params={"date_from": "2026-03-01", "date_to": "2026-03-31"},
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 200
    body = resp.json()
    assert body["meta"]["count"] == 1
    assert body["data"][0]["company"] == "Acme Corp"
    assert body["data"][0]["role_title"] == "Software Engineer"


async def test_list_events_excludes_events_outside_range(client, test_user):
    # Arrange
    _, cookies = test_user
    app_id = await _create_app(client, cookies)
    await _create_event(client, cookies, app_id, {"date": "2026-03-15"})

    # Act — query a different month
    resp = await client.get(
        "/api/calendar/events",
        params={"date_from": "2026-04-01", "date_to": "2026-04-30"},
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 200
    assert resp.json()["meta"]["count"] == 0


async def test_list_events_scoped_to_current_user(client):
    # Arrange — two users each with one event
    resp_a = await client.post(
        "/api/auth/register",
        json={"email": "a@test.com", "password": "TestPass123!", "display_name": "A"},
    )
    cookies_a = dict(resp_a.cookies)
    await verify_user_by_id(resp_a.json()["data"]["id"])

    resp_b = await client.post(
        "/api/auth/register",
        json={"email": "b@test.com", "password": "TestPass123!", "display_name": "B"},
    )
    cookies_b = dict(resp_b.cookies)
    await verify_user_by_id(resp_b.json()["data"]["id"])

    app_a = await _create_app(client, cookies_a)
    app_b = await _create_app(client, cookies_b)
    await _create_event(client, cookies_a, app_a)
    await _create_event(client, cookies_b, app_b)

    # Act
    resp = await client.get(
        "/api/calendar/events",
        params={"date_from": "2026-03-01", "date_to": "2026-03-31"},
        cookies=cookies_a,
    )

    # Assert
    assert resp.json()["meta"]["count"] == 1


async def test_list_events_returns_empty_for_other_users_application_id(client):
    # Arrange — two users; user A creates an event; user B queries with user A's app_id
    resp_a = await client.post(
        "/api/auth/register",
        json={"email": "list_a@test.com", "password": "TestPass123!", "display_name": "ListA"},
    )
    cookies_a = dict(resp_a.cookies)
    await verify_user_by_id(resp_a.json()["data"]["id"])

    resp_b = await client.post(
        "/api/auth/register",
        json={"email": "list_b@test.com", "password": "TestPass123!", "display_name": "ListB"},
    )
    cookies_b = dict(resp_b.cookies)
    await verify_user_by_id(resp_b.json()["data"]["id"])

    app_id_a = await _create_app(client, cookies_a)
    await _create_event(client, cookies_a, app_id_a)

    # Act — user B requests events filtered by user A's application_id
    resp = await client.get(
        "/api/calendar/events",
        params={"application_id": app_id_a},
        cookies=cookies_b,
    )

    # Assert — ownership check returns empty list, not user A's events
    assert resp.status_code == 200
    assert resp.json()["meta"]["count"] == 0


async def test_delete_event_returns_404_for_other_users_event(client):
    # Arrange — user A owns the event; user B attempts deletion
    resp_a = await client.post(
        "/api/auth/register",
        json={"email": "del_a@test.com", "password": "TestPass123!", "display_name": "DelA"},
    )
    cookies_a = dict(resp_a.cookies)
    await verify_user_by_id(resp_a.json()["data"]["id"])

    resp_b = await client.post(
        "/api/auth/register",
        json={"email": "del_b@test.com", "password": "TestPass123!", "display_name": "DelB"},
    )
    cookies_b = dict(resp_b.cookies)
    await verify_user_by_id(resp_b.json()["data"]["id"])

    app_id_a = await _create_app(client, cookies_a)
    event_body = await _create_event(client, cookies_a, app_id_a)
    event_id = event_body["data"]["id"]

    # Act
    resp = await client.delete(f"/api/calendar/events/{event_id}", cookies=cookies_b)

    # Assert
    assert resp.status_code == 404


async def test_list_events_returns_401_without_auth(client):
    # Act
    resp = await client.get("/api/calendar/events")

    # Assert
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# PATCH /api/calendar/events/:id
# ---------------------------------------------------------------------------


async def test_update_event_returns_updated_doc(client, test_user):
    # Arrange
    _, cookies = test_user
    app_id = await _create_app(client, cookies)
    event_body = await _create_event(client, cookies, app_id)
    event_id = event_body["data"]["id"]

    # Act
    resp = await client.patch(
        f"/api/calendar/events/{event_id}",
        json={"event_type": "onsite", "title": "Onsite Interview"},
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["event_type"] == "onsite"
    assert data["title"] == "Onsite Interview"


async def test_update_event_returns_404_for_missing_event(client, test_user):
    # Arrange
    _, cookies = test_user
    fake_id = "000000000000000000000001"

    # Act
    resp = await client.patch(
        f"/api/calendar/events/{fake_id}",
        json={"event_type": "onsite"},
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 404


async def test_update_event_returns_401_without_auth(client, test_user):
    # Arrange
    _, cookies = test_user
    app_id = await _create_app(client, cookies)
    event_body = await _create_event(client, cookies, app_id)
    event_id = event_body["data"]["id"]

    # Act
    resp = await client.patch(
        f"/api/calendar/events/{event_id}",
        json={"event_type": "onsite"},
    )

    # Assert
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# DELETE /api/calendar/events/:id
# ---------------------------------------------------------------------------


async def test_delete_event_returns_204(client, test_user):
    # Arrange
    _, cookies = test_user
    app_id = await _create_app(client, cookies)
    event_body = await _create_event(client, cookies, app_id)
    event_id = event_body["data"]["id"]

    # Act
    resp = await client.delete(f"/api/calendar/events/{event_id}", cookies=cookies)

    # Assert
    assert resp.status_code == 204


async def test_delete_event_removes_from_list(client, test_user):
    # Arrange
    _, cookies = test_user
    app_id = await _create_app(client, cookies)
    event_body = await _create_event(client, cookies, app_id)
    event_id = event_body["data"]["id"]
    await client.delete(f"/api/calendar/events/{event_id}", cookies=cookies)

    # Act
    resp = await client.get(
        "/api/calendar/events",
        params={"date_from": "2026-03-01", "date_to": "2026-03-31"},
        cookies=cookies,
    )

    # Assert
    assert resp.json()["meta"]["count"] == 0


async def test_delete_event_returns_404_for_missing_event(client, test_user):
    # Arrange
    _, cookies = test_user
    fake_id = "000000000000000000000001"

    # Act
    resp = await client.delete(f"/api/calendar/events/{fake_id}", cookies=cookies)

    # Assert
    assert resp.status_code == 404


async def test_delete_event_returns_401_without_auth(client, test_user):
    # Arrange
    _, cookies = test_user
    app_id = await _create_app(client, cookies)
    event_body = await _create_event(client, cookies, app_id)
    event_id = event_body["data"]["id"]

    # Act
    resp = await client.delete(f"/api/calendar/events/{event_id}")

    # Assert
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Result limit and date range validation
# ---------------------------------------------------------------------------


async def test_list_events_caps_at_500_documents(client, test_user):
    """Querying list_events with 501 events in DB should return at most 500."""
    from bson import ObjectId

    # Arrange
    user, cookies = test_user
    app_id = await _create_app(client, cookies)

    uid = ObjectId(user["id"])
    aid = ObjectId(app_id)
    base_date = dt.datetime(2026, 3, 1, tzinfo=dt.timezone.utc)

    docs = [
        {
            "user_id": uid,
            "application_id": aid,
            "event_type": "technical",
            "date": base_date,
            "time": None,
            "notes": None,
            "title": f"Event {i}",
        }
        for i in range(501)
    ]
    await get_collection("calendar_events").insert_many(docs)

    # Act
    resp = await client.get(
        "/api/calendar/events",
        params={"date_from": "2026-03-01", "date_to": "2026-03-31"},
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["data"]) == 500
    assert body["meta"]["count"] == 500


async def test_list_events_returns_400_for_date_range_over_366_days(client, test_user):
    # Arrange
    _, cookies = test_user

    # Act — 367-day range exceeds the 366-day limit
    resp = await client.get(
        "/api/calendar/events",
        params={"date_from": "2026-01-01", "date_to": "2027-01-03"},
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 400
    assert resp.json()["detail"]["code"] == "INVALID_DATE_RANGE"


async def test_list_events_accepts_date_range_of_exactly_366_days(client, test_user):
    # Arrange
    _, cookies = test_user

    # Act — exactly 366 days is permitted
    resp = await client.get(
        "/api/calendar/events",
        params={"date_from": "2026-01-01", "date_to": "2027-01-02"},
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Prep checklist and notes (US-054)
# ---------------------------------------------------------------------------


async def test_update_event_sets_prep_checklist_and_notes(client, test_user):
    # Arrange
    _, cookies = test_user
    app_id = await _create_app(client, cookies)
    event_body = await _create_event(client, cookies, app_id)
    event_id = event_body["data"]["id"]

    checklist = [
        {"id": "item-1", "text": "Research company culture", "checked": False},
        {"id": "item-2", "text": "Review system design concepts", "checked": True},
    ]

    # Act
    resp = await client.patch(
        f"/api/calendar/events/{event_id}",
        json={"prep_notes": "Remember to prepare questions", "prep_checklist": checklist},
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["prep_notes"] == "Remember to prepare questions"
    assert len(data["prep_checklist"]) == 2
    assert data["prep_checklist"][0]["text"] == "Research company culture"
    assert data["prep_checklist"][0]["checked"] is False
    assert data["prep_checklist"][1]["text"] == "Review system design concepts"
    assert data["prep_checklist"][1]["checked"] is True
