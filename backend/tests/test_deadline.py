"""Tests for application deadline field CRUD."""

from datetime import datetime, timedelta, timezone

import pytest

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_create_application_with_deadline(client, test_user):
    """Test creating an application with a deadline."""
    _, cookies = test_user
    deadline = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    
    response = await client.post(
        "/api/applications",
        json={
            "role_title": "Engineer",
            "company": "TechCorp",
            "source": "manual",
        },
        cookies=cookies,
    )
    app_id = response.json()["data"]["id"]
    
    # Update with deadline
    response = await client.patch(
        f"/api/applications/{app_id}",
        json={"deadline": deadline},
        cookies=cookies,
    )
    
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["deadline"] is not None
    # Verify deadline is parseable as ISO datetime
    deadline_obj = datetime.fromisoformat(data["deadline"])
    assert deadline_obj.year == datetime.now(timezone.utc).year


async def test_get_application_with_deadline(client, test_user):
    """Test retrieving an application with deadline field."""
    _, cookies = test_user
    deadline = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    
    # Create app
    response = await client.post(
        "/api/applications",
        json={"role_title": "PM", "company": "StartupCo", "source": "manual"},
        cookies=cookies,
    )
    app_id = response.json()["data"]["id"]
    
    # Update deadline
    await client.patch(
        f"/api/applications/{app_id}",
        json={"deadline": deadline},
        cookies=cookies,
    )
    
    # Get and verify
    response = await client.get(f"/api/applications/{app_id}", cookies=cookies)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["deadline"] is not None


async def test_list_applications_includes_deadline(client, test_user):
    """Test that deadline is included in application list."""
    _, cookies = test_user
    deadline = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    
    # Create app
    response = await client.post(
        "/api/applications",
        json={"role_title": "Designer", "company": "DesignStudio", "source": "manual"},
        cookies=cookies,
    )
    app_id = response.json()["data"]["id"]
    
    # Update deadline
    await client.patch(
        f"/api/applications/{app_id}",
        json={"deadline": deadline},
        cookies=cookies,
    )
    
    # List and verify deadline is present
    response = await client.get("/api/applications", cookies=cookies)
    assert response.status_code == 200
    apps = response.json()["data"]
    matching = [a for a in apps if a["id"] == app_id]
    assert len(matching) == 1
    assert matching[0]["deadline"] is not None


async def test_clear_deadline(client, test_user):
    """Test clearing a deadline by setting it to null."""
    _, cookies = test_user
    deadline = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    
    # Create and update with deadline
    response = await client.post(
        "/api/applications",
        json={"role_title": "QA", "company": "TestCorp", "source": "manual"},
        cookies=cookies,
    )
    app_id = response.json()["data"]["id"]
    
    await client.patch(
        f"/api/applications/{app_id}",
        json={"deadline": deadline},
        cookies=cookies,
    )
    
    # Clear deadline
    response = await client.patch(
        f"/api/applications/{app_id}",
        json={"deadline": None},
        cookies=cookies,
    )
    
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["deadline"] is None


async def test_update_deadline(client, test_user):
    """Test updating an existing deadline."""
    _, cookies = test_user
    deadline1 = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    deadline2 = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()
    
    # Create and set initial deadline
    response = await client.post(
        "/api/applications",
        json={"role_title": "DevOps", "company": "CloudCorp", "source": "manual"},
        cookies=cookies,
    )
    app_id = response.json()["data"]["id"]
    
    await client.patch(
        f"/api/applications/{app_id}",
        json={"deadline": deadline1},
        cookies=cookies,
    )
    
    # Update to new deadline
    response = await client.patch(
        f"/api/applications/{app_id}",
        json={"deadline": deadline2},
        cookies=cookies,
    )
    
    assert response.status_code == 200
    data = response.json()["data"]
    # Verify the new deadline is set
    updated_deadline = datetime.fromisoformat(data["deadline"]).replace(tzinfo=timezone.utc) if datetime.fromisoformat(data["deadline"]).tzinfo is None else datetime.fromisoformat(data["deadline"])
    original_deadline = datetime.fromisoformat(deadline1).replace(tzinfo=timezone.utc) if datetime.fromisoformat(deadline1).tzinfo is None else datetime.fromisoformat(deadline1)
    assert updated_deadline > original_deadline


async def test_deadline_survives_other_updates(client, test_user):
    """Test that deadline is preserved when updating other fields."""
    _, cookies = test_user
    deadline = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    
    # Create and set deadline
    response = await client.post(
        "/api/applications",
        json={"role_title": "SRE", "company": "InfraCorp", "source": "manual"},
        cookies=cookies,
    )
    app_id = response.json()["data"]["id"]
    
    await client.patch(
        f"/api/applications/{app_id}",
        json={"deadline": deadline},
        cookies=cookies,
    )
    
    # Update different field (notes)
    response = await client.patch(
        f"/api/applications/{app_id}",
        json={"notes": "Updated notes"},
        cookies=cookies,
    )
    
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["deadline"] is not None
    assert data["notes"] == "Updated notes"
