"""Tests for timeline sharing functionality."""

from datetime import datetime, timezone
import pytest

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_create_timeline_share(client, test_user):
    """Test creating a timeline share link."""
    _, cookies = test_user
    
    response = await client.post("/api/sharing/timeline", cookies=cookies)
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["slug"] is not None
    assert data["is_active"] is True
    assert len(data["slug"]) > 0


async def test_get_my_timeline_share(client, test_user):
    """Test retrieving the caller's timeline share."""
    _, cookies = test_user
    
    # Create share
    create_response = await client.post("/api/sharing/timeline", cookies=cookies)
    created_slug = create_response.json()["data"]["slug"]
    
    # Get my share
    response = await client.get("/api/sharing/timeline", cookies=cookies)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data is not None
    assert data["slug"] == created_slug
    assert data["is_active"] is True


async def test_get_public_timeline_without_auth(client, test_user):
    """Test accessing a public timeline without authentication."""
    _, cookies = test_user
    
    # Create an application first
    app_response = await client.post(
        "/api/applications",
        json={
            "role_title": "Software Engineer",
            "company": "TechCorp",
            "source": "manual",
        },
        cookies=cookies,
    )
    assert app_response.status_code == 201
    
    # Create timeline share
    share_response = await client.post("/api/sharing/timeline", cookies=cookies)
    slug = share_response.json()["data"]["slug"]
    
    # Access public timeline without authentication
    response = await client.get(f"/api/public/timeline/{slug}")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["display_name"] is not None
    assert "applications" in data
    assert len(data["applications"]) > 0
    
    # Verify sensitive fields are excluded
    app = data["applications"][0]
    assert "role_title" in app
    assert "company" in app
    assert "current_stage" in app
    assert "date_applied" in app
    # These should NOT be present
    assert "notes" not in app
    assert "compensation" not in app
    assert "ai_analysis" not in app
    assert "custom_fields" not in app
    assert "documents" not in app


async def test_timeline_share_includes_stage_history(client, test_user):
    """Test that timeline share includes stage history for outcomes."""
    _, cookies = test_user
    
    # Create application
    app_response = await client.post(
        "/api/applications",
        json={
            "role_title": "PM",
            "company": "StartupCo",
            "source": "manual",
        },
        cookies=cookies,
    )
    app_id = app_response.json()["data"]["id"]
    
    # Update to Offer stage
    await client.patch(
        f"/api/applications/{app_id}",
        json={"current_stage": "Offer"},
        cookies=cookies,
    )
    
    # Create timeline share
    share_response = await client.post("/api/sharing/timeline", cookies=cookies)
    slug = share_response.json()["data"]["slug"]
    
    # Get public timeline
    response = await client.get(f"/api/public/timeline/{slug}")
    assert response.status_code == 200
    data = response.json()["data"]
    
    app = data["applications"][0]
    assert app["current_stage"] == "Offer"
    assert "stage_history" in app


async def test_expired_timeline_share_returns_404(client, test_user):
    """Test that expired timeline shares return 404."""
    _, cookies = test_user
    
    # Create timeline share
    share_response = await client.post("/api/sharing/timeline", cookies=cookies)
    slug = share_response.json()["data"]["slug"]
    
    # Manually expire the share in the database
    from database import get_collection
    from bson import ObjectId
    shares = get_collection("shares")
    from datetime import timedelta
    
    await shares.update_one(
        {"slug": slug},
        {"$set": {"expires_at": datetime.now(timezone.utc) - timedelta(hours=1)}}
    )
    
    # Try to access expired timeline
    response = await client.get(f"/api/public/timeline/{slug}")
    assert response.status_code == 404


async def test_invalid_timeline_slug_returns_404(client):
    """Test that invalid timeline slugs return 404."""
    response = await client.get("/api/public/timeline/invalid_slug_12345")
    assert response.status_code == 404


async def test_pipeline_and_timeline_shares_separate(client, test_user):
    """Test that pipeline and timeline shares are separate."""
    _, cookies = test_user
    
    # Create application
    await client.post(
        "/api/applications",
        json={"role_title": "DevOps", "company": "CloudCorp", "source": "manual"},
        cookies=cookies,
    )
    
    # Create both pipeline and timeline shares
    pipeline_response = await client.post("/api/sharing/create", cookies=cookies)
    pipeline_slug = pipeline_response.json()["data"]["slug"]
    
    timeline_response = await client.post("/api/sharing/timeline", cookies=cookies)
    timeline_slug = timeline_response.json()["data"]["slug"]
    
    # Both should work independently
    assert pipeline_slug != timeline_slug
    
    # Both should be accessible
    pipeline_data = await client.get(f"/api/public/{pipeline_slug}")
    timeline_data = await client.get(f"/api/public/timeline/{timeline_slug}")
    
    assert pipeline_data.status_code == 200
    assert timeline_data.status_code == 200
