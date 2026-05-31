"""Integration tests for appearance preferences and stage color endpoints."""

import pytest

pytestmark = pytest.mark.asyncio(loop_scope="session")

REGISTER_PAYLOAD = {
    "email": "test@example.com",
    "password": "TestPass123!",
    "display_name": "Test User",
}


async def test_update_appearance_prefs_success(client):
    # Arrange
    await client.post("/api/auth/register", json=REGISTER_PAYLOAD)

    # Act
    response = await client.patch(
        "/api/auth/me/appearance",
        json={"theme": "dark", "density": "comfortable"},
    )

    # Assert
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["appearance_prefs"]["theme"] == "dark"
    assert data["appearance_prefs"]["density"] == "comfortable"


async def test_update_appearance_prefs_with_font_and_accent(client):
    # Arrange
    await client.post("/api/auth/register", json={
        "email": "test2@example.com",
        "password": "TestPass123!",
        "display_name": "Test User 2",
    })

    # Act
    response = await client.patch(
        "/api/auth/me/appearance",
        json={"font_size": 3, "accent_color": "cardinal"},
    )

    # Assert
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["appearance_prefs"]["font_size"] == 3
    assert data["appearance_prefs"]["accent_color"] == "cardinal"


async def test_update_appearance_prefs_invalid_theme(client):
    # Arrange
    await client.post("/api/auth/register", json={
        "email": "test3@example.com",
        "password": "TestPass123!",
        "display_name": "Test User 3",
    })

    # Act
    response = await client.patch(
        "/api/auth/me/appearance",
        json={"theme": "invalid"},
    )

    # Assert
    assert response.status_code == 422


async def test_update_appearance_prefs_invalid_hex_color(client):
    # Arrange
    await client.post("/api/auth/register", json={
        "email": "test4@example.com",
        "password": "TestPass123!",
        "display_name": "Test User 4",
    })

    # Act
    response = await client.patch(
        "/api/auth/me/appearance",
        json={"accent_color": "badcolor"},
    )

    # Assert
    assert response.status_code == 422


async def test_update_appearance_prefs_unauthenticated(client):
    # Act
    response = await client.patch(
        "/api/auth/me/appearance",
        json={"theme": "dark"},
    )

    # Assert
    assert response.status_code == 401


async def test_update_stage_colors_success(client):
    # Arrange
    await client.post("/api/auth/register", json={
        "email": "test5@example.com",
        "password": "TestPass123!",
        "display_name": "Test User 5",
    })

    # Act
    response = await client.patch(
        "/api/auth/me/stage-colors",
        json={"colors": {"Applied": "#FF5733", "Rejected": "#333333"}},
    )

    # Assert
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["pipeline_stage_colors"]["Applied"] == "#FF5733"
    assert data["pipeline_stage_colors"]["Rejected"] == "#333333"


async def test_update_stage_colors_empty(client):
    # Arrange
    await client.post("/api/auth/register", json={
        "email": "test6@example.com",
        "password": "TestPass123!",
        "display_name": "Test User 6",
    })

    # Act
    response = await client.patch("/api/auth/me/stage-colors", json={"colors": {}})

    # Assert
    assert response.status_code == 200
    data = response.json()["data"]
    # Empty overrides should be None or empty dict depending on backend.
    assert data["pipeline_stage_colors"] is None or data["pipeline_stage_colors"] == {}


async def test_update_stage_colors_invalid_hex(client):
    # Arrange
    await client.post("/api/auth/register", json={
        "email": "test_hex1@example.com",
        "password": "TestPass123!",
        "display_name": "Test User Hex",
    })

    # Act
    response = await client.patch(
        "/api/auth/me/stage-colors",
        json={"colors": {"Applied": "badcolor"}},
    )

    # Assert
    assert response.status_code == 422


async def test_update_stage_colors_invalid_hex_short(client):
    # Arrange
    await client.post("/api/auth/register", json={
        "email": "test_hex2@example.com",
        "password": "TestPass123!",
        "display_name": "Test User Hex 2",
    })

    # Act
    response = await client.patch(
        "/api/auth/me/stage-colors",
        json={"colors": {"Applied": "#FF57"}},
    )

    # Assert
    assert response.status_code == 422


async def test_update_stage_colors_invalid_stage_name(client):
    # Arrange
    await client.post("/api/auth/register", json={
        "email": "test_hex3@example.com",
        "password": "TestPass123!",
        "display_name": "Test User Hex 3",
    })

    # Act
    response = await client.patch(
        "/api/auth/me/stage-colors",
        json={"colors": {"": "#FF5733"}},
    )

    # Assert
    assert response.status_code == 422


async def test_update_stage_colors_unauthenticated(client):
    # Act
    response = await client.patch(
        "/api/auth/me/stage-colors",
        json={"colors": {"Applied": "#FF5733"}},
    )

    # Assert
    assert response.status_code == 401


async def test_appearance_prefs_isolated_per_user(client):
    # Arrange: Create two users with different prefs
    user1 = {
        "email": "user1@example.com",
        "password": "TestPass123!",
        "display_name": "User 1",
    }
    user2 = {
        "email": "user2@example.com",
        "password": "TestPass123!",
        "display_name": "User 2",
    }

    resp1 = await client.post("/api/auth/register", json=user1)
    user1_id = resp1.json()["data"]["id"]

    # Reset session and register user 2
    client.cookies.clear()
    resp2 = await client.post("/api/auth/register", json=user2)
    user2_id = resp2.json()["data"]["id"]

    # Act: User 2 sets prefs
    await client.patch(
        "/api/auth/me/appearance",
        json={"theme": "dark"},
    )

    # Assert: Login as user 1 and verify their prefs are empty
    client.cookies.clear()
    await client.post("/api/auth/login", json={
        "email": user1["email"],
        "password": user1["password"],
    })
    me = await client.get("/api/auth/me")
    user1_data = me.json()["data"]
    assert user1_data["appearance_prefs"] is None


async def test_get_me_includes_appearance_prefs(client):
    # Arrange
    await client.post("/api/auth/register", json={
        "email": "test7@example.com",
        "password": "TestPass123!",
        "display_name": "Test User 7",
    })
    await client.patch(
        "/api/auth/me/appearance",
        json={"theme": "light", "density": "compact"},
    )

    # Act
    response = await client.get("/api/auth/me")

    # Assert
    data = response.json()["data"]
    assert data["appearance_prefs"]["theme"] == "light"
    assert data["appearance_prefs"]["density"] == "compact"
