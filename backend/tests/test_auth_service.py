"""Tests for auth service: password hashing, JWT creation/decode, and user CRUD."""

import pytest
import jwt as pyjwt

from auth.service import (
    DuplicateEmailError,
    create_access_token,
    create_refresh_token,
    create_user,
    decode_token,
    get_user_by_email,
    get_user_by_id,
    hash_password,
    verify_password,
)
from config import settings

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_hash_password_returns_bcrypt_hash():
    # Act
    hashed = hash_password("TestPass123!")

    # Assert
    assert hashed != "TestPass123!"
    assert hashed.startswith("$2b$12$")


async def test_verify_password_returns_true_for_correct_password():
    # Arrange
    hashed = hash_password("TestPass123!")

    # Act / Assert
    assert verify_password("TestPass123!", hashed) is True


async def test_verify_password_returns_false_for_wrong_password():
    # Arrange
    hashed = hash_password("TestPass123!")

    # Act / Assert
    assert verify_password("WrongPass!", hashed) is False


async def test_create_access_token_contains_correct_claims():
    # Arrange
    user_id = "507f1f77bcf86cd799439011"

    # Act
    token = create_access_token(user_id)

    # Assert
    payload = pyjwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    assert payload["sub"] == user_id
    assert payload["type"] == "access"


async def test_create_refresh_token_contains_correct_claims():
    # Arrange
    user_id = "507f1f77bcf86cd799439011"

    # Act
    token = create_refresh_token(user_id)

    # Assert
    payload = pyjwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    assert payload["sub"] == user_id
    assert payload["type"] == "refresh"


async def test_access_token_ttl_differs_from_refresh_token_ttl():
    # Arrange
    user_id = "507f1f77bcf86cd799439011"

    # Act
    access = create_access_token(user_id)
    refresh = create_refresh_token(user_id)

    # Assert — refresh token expires later than access token
    access_payload = pyjwt.decode(access, settings.jwt_secret, algorithms=["HS256"])
    refresh_payload = pyjwt.decode(refresh, settings.jwt_secret, algorithms=["HS256"])
    assert refresh_payload["exp"] > access_payload["exp"]


async def test_decode_token_returns_token_payload_for_valid_token():
    # Arrange
    user_id = "507f1f77bcf86cd799439011"
    token = create_access_token(user_id)

    # Act
    payload = decode_token(token)

    # Assert
    assert payload.sub == user_id
    assert payload.type == "access"


async def test_decode_token_raises_for_invalid_token():
    # Act / Assert
    with pytest.raises(pyjwt.exceptions.InvalidTokenError):
        decode_token("not.a.valid.token")


async def test_create_user_inserts_with_default_stages(app):
    # Act
    doc = await create_user("user@example.com", "TestPass123!", "Test User")

    # Assert
    assert doc["email"] == "user@example.com"
    assert doc["display_name"] == "Test User"
    assert doc["default_stages"] == ["Applied", "Phone Screen", "Onsite", "Offer", "Rejected"]
    assert "_id" in doc


async def test_create_user_stores_hashed_password_not_plaintext(app):
    # Act
    doc = await create_user("hash@example.com", "TestPass123!", "Hash User")

    # Assert
    assert "password_hash" in doc
    assert doc["password_hash"] != "TestPass123!"
    assert doc["password_hash"].startswith("$2b$12$")


async def test_create_user_raises_duplicate_email_error_on_duplicate(app):
    # Arrange
    await create_user("dup@example.com", "TestPass123!", "User One")

    # Act / Assert
    with pytest.raises(DuplicateEmailError):
        await create_user("dup@example.com", "OtherPass456!", "User Two")


async def test_get_user_by_email_returns_doc_for_existing_user(app):
    # Arrange
    await create_user("find@example.com", "TestPass123!", "Find Me")

    # Act
    doc = await get_user_by_email("find@example.com")

    # Assert
    assert doc is not None
    assert doc["email"] == "find@example.com"


async def test_get_user_by_email_returns_none_for_missing_user(app):
    # Act
    result = await get_user_by_email("notfound@example.com")

    # Assert
    assert result is None


async def test_get_user_by_id_returns_doc_for_existing_user(app):
    # Arrange
    inserted = await create_user("byid@example.com", "TestPass123!", "By ID")
    user_id = str(inserted["_id"])

    # Act
    result = await get_user_by_id(user_id)

    # Assert
    assert result is not None
    assert str(result["_id"]) == user_id


async def test_get_user_by_id_returns_none_for_missing_id(app):
    # Act
    result = await get_user_by_id("507f1f77bcf86cd799439011")

    # Assert
    assert result is None
