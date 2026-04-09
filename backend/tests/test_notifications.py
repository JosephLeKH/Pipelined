"""Integration tests for notifications endpoints."""

import pytest

pytestmark = pytest.mark.asyncio(loop_scope="session")


# ---------------------------------------------------------------------------
# GET /api/notifications
# ---------------------------------------------------------------------------


async def test_list_notifications_returns_empty_for_new_user(client, test_user):
    # Arrange
    _, cookies = test_user

    # Act
    resp = await client.get("/api/notifications", cookies=cookies)

    # Assert
    assert resp.status_code == 200
    assert resp.json()["data"] == []


async def test_list_notifications_requires_auth(client):
    # Act
    resp = await client.get("/api/notifications")

    # Assert
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/notifications/unread-count
# ---------------------------------------------------------------------------


async def test_unread_count_returns_zero_for_new_user(client, test_user):
    # Arrange
    _, cookies = test_user

    # Act
    resp = await client.get("/api/notifications/unread-count", cookies=cookies)

    # Assert
    assert resp.status_code == 200
    assert resp.json()["data"]["count"] == 0


# ---------------------------------------------------------------------------
# PATCH /api/notifications/read-all
# ---------------------------------------------------------------------------


async def test_mark_all_read_returns_zero_when_no_notifications(client, test_user):
    # Arrange
    _, cookies = test_user

    # Act
    resp = await client.patch("/api/notifications/read-all", cookies=cookies)

    # Assert
    assert resp.status_code == 200
    assert resp.json()["data"]["marked"] == 0


# ---------------------------------------------------------------------------
# PATCH /api/notifications/{id}/read
# ---------------------------------------------------------------------------


async def test_mark_read_not_found_returns_404(client, test_user):
    # Arrange
    _, cookies = test_user

    # Act
    resp = await client.patch(
        "/api/notifications/000000000000000000000000/read",
        cookies=cookies,
    )

    # Assert
    assert resp.status_code == 404


async def test_mark_all_read_marks_unread_notifications(client, test_user):
    # Arrange
    from bson import ObjectId
    from database import get_collection
    import datetime as dt

    _, cookies = test_user

    # Fetch user id by getting /api/auth/me
    me_resp = await client.get("/api/auth/me", cookies=cookies)
    user_id_str = me_resp.json()["data"]["id"]
    user_id = ObjectId(user_id_str)

    col = get_collection("notifications")
    now = dt.datetime.now(dt.timezone.utc)
    await col.insert_many([
        {"user_id": user_id, "type": "stale_app", "title": "T1", "body": "B1",
         "action_url": None, "read": False, "created_at": now},
        {"user_id": user_id, "type": "stale_app", "title": "T2", "body": "B2",
         "action_url": None, "read": False, "created_at": now},
    ])

    # Act
    resp = await client.patch("/api/notifications/read-all", cookies=cookies)

    # Assert
    assert resp.status_code == 200
    assert resp.json()["data"]["marked"] == 2

    count_resp = await client.get("/api/notifications/unread-count", cookies=cookies)
    assert count_resp.json()["data"]["count"] == 0


async def test_mark_single_read(client, test_user):
    # Arrange
    from bson import ObjectId
    from database import get_collection
    import datetime as dt

    _, cookies = test_user

    me_resp = await client.get("/api/auth/me", cookies=cookies)
    user_id = ObjectId(me_resp.json()["data"]["id"])

    col = get_collection("notifications")
    now = dt.datetime.now(dt.timezone.utc)
    result = await col.insert_one({
        "user_id": user_id, "type": "follow_up_due", "title": "FU", "body": "body",
        "action_url": None, "read": False, "created_at": now,
    })
    notif_id = str(result.inserted_id)

    # Act
    resp = await client.patch(f"/api/notifications/{notif_id}/read", cookies=cookies)

    # Assert
    assert resp.status_code == 200
    assert resp.json()["data"]["ok"] is True

    count_resp = await client.get("/api/notifications/unread-count", cookies=cookies)
    assert count_resp.json()["data"]["count"] == 0


async def test_list_notifications_shows_inserted(client, test_user):
    # Arrange
    from bson import ObjectId
    from database import get_collection
    import datetime as dt

    _, cookies = test_user

    me_resp = await client.get("/api/auth/me", cookies=cookies)
    user_id = ObjectId(me_resp.json()["data"]["id"])

    col = get_collection("notifications")
    now = dt.datetime.now(dt.timezone.utc)
    await col.insert_one({
        "user_id": user_id, "type": "interview_tomorrow", "title": "Interview",
        "body": "You have an interview tomorrow.", "action_url": "/calendar",
        "read": False, "created_at": now,
    })

    # Act
    resp = await client.get("/api/notifications", cookies=cookies)

    # Assert
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) >= 1
    assert any(n["type"] == "interview_tomorrow" for n in data)
