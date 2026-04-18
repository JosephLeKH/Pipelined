"""Tests for custom fields endpoints."""

import pytest


@pytest.mark.asyncio
async def test_custom_fields_endpoint_list(client, test_user) -> None:
    """Test GET /api/custom-fields returns user's field definitions."""
    _, cookies = test_user
    response = await client.get("/api/custom-fields", cookies=cookies)
    
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert "fields" in data["data"]
    assert isinstance(data["data"]["fields"], list)


@pytest.mark.asyncio
async def test_custom_fields_endpoint_create(client, test_user) -> None:
    """Test POST /api/custom-fields creates field definitions."""
    _, cookies = test_user
    payload = {
        "fields": [
            {"name": "Priority", "field_type": "text"},
            {"name": "Location", "field_type": "select", "options": ["US", "Remote", "EU"]},
        ]
    }
    
    response = await client.post("/api/custom-fields", json=payload, cookies=cookies)
    
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert len(data["data"]["fields"]) == 2
    assert data["data"]["fields"][0]["name"] == "Priority"


@pytest.mark.asyncio
async def test_custom_fields_endpoint_exceeds_max(client, test_user) -> None:
    """Test that POST /api/custom-fields with >10 fields returns 400."""
    _, cookies = test_user
    payload = {
        "fields": [{"name": f"Field{i}", "field_type": "text"} for i in range(11)]
    }
    
    response = await client.post("/api/custom-fields", json=payload, cookies=cookies)
    
    assert response.status_code == 400
    data = response.json()
    assert "error" in data


@pytest.mark.asyncio
async def test_application_with_custom_fields(client, test_user) -> None:
    """Test creating an application with custom field values."""
    _, cookies = test_user
    
    # First define custom fields
    custom_fields_payload = {
        "fields": [
            {"name": "Referral Contact", "field_type": "text"},
        ]
    }
    await client.post("/api/custom-fields", json=custom_fields_payload, cookies=cookies)
    
    # Create application with custom field value
    app_payload = {
        "role_title": "Senior Engineer",
        "company": "TechCorp",
        "source": "manual",
        "custom_fields": {"Referral Contact": "John Smith"},
    }
    
    response = await client.post("/api/applications", json=app_payload, cookies=cookies)
    
    assert response.status_code == 201
    data = response.json()
    app_id = data["data"]["id"]
    
    # Verify custom fields are returned in response
    get_response = await client.get(f"/api/applications/{app_id}", cookies=cookies)
    assert get_response.status_code == 200
    get_data = get_response.json()
    assert get_data["data"]["custom_fields"] == {"Referral Contact": "John Smith"}


@pytest.mark.asyncio
async def test_application_update_custom_fields(client, test_user) -> None:
    """Test updating custom field values on an existing application."""
    _, cookies = test_user
    
    # Create an application first
    app_payload = {
        "role_title": "Engineer",
        "company": "StartupXYZ",
        "source": "manual",
    }
    create_response = await client.post("/api/applications", json=app_payload, cookies=cookies)
    app_id = create_response.json()["data"]["id"]
    
    # Update with custom fields
    update_payload = {
        "custom_fields": {"Team": "Frontend", "Priority": "High"},
    }
    
    response = await client.patch(
        f"/api/applications/{app_id}",
        json=update_payload,
        cookies=cookies,
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["custom_fields"] == {"Team": "Frontend", "Priority": "High"}
