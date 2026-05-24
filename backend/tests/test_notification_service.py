"""Tests for notifications/notification_service.py — notification generation logic."""

from datetime import datetime, timedelta, timezone

import pytest
from bson import ObjectId

import database
from notifications.notification_service import (
    _generate_follow_up_due_notifications,
    _generate_interview_tomorrow_notifications,
    _generate_stale_app_notifications,
)

pytestmark = pytest.mark.asyncio(loop_scope="function")


async def test_stale_app_notification_created(test_user):
    """Insert app with updated_at 20 days ago in non-terminal stage. Assert stale_app notification created."""
    user_id_obj = ObjectId(test_user[0]["id"])

    # Create application with old updated_at
    cutoff = datetime.now(timezone.utc) - timedelta(days=20)
    apps_col = database.get_collection("applications")
    result = await apps_col.insert_one({
        "user_id": user_id_obj,
        "company": "Stale Corp",
        "role_title": "Software Engineer",
        "source": "manual",
        "current_stage": "Applied",
        "updated_at": cutoff,
    })
    app_id = str(result.inserted_id)

    # Generate notifications
    await _generate_stale_app_notifications()

    # Assert notification was created
    notif_col = database.get_collection("notifications")
    notification = await notif_col.find_one({
        "user_id": user_id_obj,
        "type": "stale_app",
        "action_url": {"$regex": app_id},
    })
    assert notification is not None
    assert "Stale Corp" in notification["title"]


async def test_stale_app_notification_skipped_for_archived_app(test_user):
    """Insert archived app. Assert NO stale_app notification created."""
    user_id_obj = ObjectId(test_user[0]["id"])

    # Create application with old updated_at but archived
    cutoff = datetime.now(timezone.utc) - timedelta(days=20)
    apps_col = database.get_collection("applications")
    result = await apps_col.insert_one({
        "user_id": user_id_obj,
        "company": "Archived Corp",
        "role_title": "Backend Engineer",
        "source": "manual",
        "current_stage": "Applied",
        "archived": True,
        "updated_at": cutoff,
    })
    app_id = str(result.inserted_id)

    # Generate notifications
    await _generate_stale_app_notifications()

    # Assert NO notification was created
    notif_col = database.get_collection("notifications")
    notification = await notif_col.find_one({
        "user_id": user_id_obj,
        "type": "stale_app",
        "action_url": {"$regex": app_id},
    })
    assert notification is None


async def test_stale_app_notification_deduplication(test_user):
    """Insert stale notification from 3 days ago. Generate again. Assert only 1 notification exists."""
    user_id_obj = ObjectId(test_user[0]["id"])

    # Create application
    cutoff = datetime.now(timezone.utc) - timedelta(days=20)
    apps_col = database.get_collection("applications")
    result = await apps_col.insert_one({
        "user_id": user_id_obj,
        "company": "Dedup Corp",
        "role_title": "Data Engineer",
        "source": "manual",
        "current_stage": "Phone Screen",
        "updated_at": cutoff,
    })
    app_id = str(result.inserted_id)

    # Create a stale_app notification from 3 days ago
    notif_col = database.get_collection("notifications")
    old_notif_time = datetime.now(timezone.utc) - timedelta(days=3)
    await notif_col.insert_one({
        "user_id": user_id_obj,
        "type": "stale_app",
        "title": "Old notification",
        "body": "This is old",
        "action_url": f"/dashboard?selected={app_id}",
        "read": False,
        "created_at": old_notif_time,
    })

    # Generate notifications
    await _generate_stale_app_notifications()

    # Assert only 1 notification exists for this app
    notifications = await notif_col.find({
        "user_id": user_id_obj,
        "type": "stale_app",
        "action_url": {"$regex": app_id},
    }).to_list(length=10)
    assert len(notifications) == 1


async def test_follow_up_due_notification_created(test_user):
    """Insert app with follow_up_date in the past. Generate. Assert follow_up_due notification created."""
    user_id_obj = ObjectId(test_user[0]["id"])

    # Create application with overdue follow-up (2 days ago, before today_start)
    from datetime import date, time
    past = datetime.combine(date.today() - timedelta(days=2), time.min, tzinfo=timezone.utc)
    apps_col = database.get_collection("applications")
    result = await apps_col.insert_one({
        "user_id": user_id_obj,
        "company": "FollowUp Inc",
        "role_title": "Product Manager",
        "source": "manual",
        "current_stage": "Applied",
        "follow_up_date": past,
    })
    app_id = str(result.inserted_id)

    # Generate notifications
    await _generate_follow_up_due_notifications()

    # Assert notification was created
    notif_col = database.get_collection("notifications")
    notification = await notif_col.find_one({
        "user_id": user_id_obj,
        "type": "follow_up_due",
        "action_url": {"$regex": app_id},
    })
    assert notification is not None
    assert "overdue" in notification["title"].lower()


async def test_interview_tomorrow_notification_created(test_user):
    """Insert calendar event for tomorrow. Generate. Assert interview_tomorrow notification created."""
    from datetime import date, time
    user_id_obj = ObjectId(test_user[0]["id"])

    # Create calendar event for tomorrow using date.today() like the service does
    tomorrow = date.today() + timedelta(days=1)
    tomorrow_start = datetime.combine(tomorrow, time.min, tzinfo=timezone.utc)

    events_col = database.get_collection("calendar_events")
    result = await events_col.insert_one({
        "user_id": user_id_obj,
        "company": "Interview Corp",
        "role_title": "Senior Engineer",
        "event_type": "phone_screen",
        "date": tomorrow_start,
    })
    event_id = str(result.inserted_id)

    # Generate notifications
    await _generate_interview_tomorrow_notifications()

    # Assert notification was created
    notif_col = database.get_collection("notifications")
    notification = await notif_col.find_one({
        "user_id": user_id_obj,
        "type": "interview_tomorrow",
        "action_url": {"$regex": event_id},
    })
    assert notification is not None
    assert "Interview tomorrow" in notification["title"]


async def test_no_notifications_for_fresh_application(test_user):
    """Insert app updated today with non-terminal stage. Assert no stale_app notification created."""
    user_id_obj = ObjectId(test_user[0]["id"])

    # Create application updated just now
    apps_col = database.get_collection("applications")
    result = await apps_col.insert_one({
        "user_id": user_id_obj,
        "company": "Fresh Corp",
        "role_title": "Intern",
        "source": "manual",
        "current_stage": "Applied",
        "updated_at": datetime.now(timezone.utc),
    })
    app_id = str(result.inserted_id)

    # Generate notifications
    await _generate_stale_app_notifications()

    # Assert NO notification was created
    notif_col = database.get_collection("notifications")
    notification = await notif_col.find_one({
        "user_id": user_id_obj,
        "type": "stale_app",
        "action_url": {"$regex": app_id},
    })
    assert notification is None
