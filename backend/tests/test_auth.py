"""Integration tests for auth router endpoints."""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest

import database
from tests.conftest import as_anonymous

pytestmark = pytest.mark.asyncio(loop_scope="session")

REGISTER_PAYLOAD = {
    "email": "test@example.com",
    "password": "TestPass123!",
    "display_name": "Test User",
}


async def test_register_returns_201_with_user_data(client):
    # Act
    response = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)

    # Assert
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["email"] == "test@example.com"
    assert data["display_name"] == "Test User"
    assert "id" in data
    assert "password_hash" not in data


async def test_register_sets_auth_cookies(client):
    # Act
    response = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)

    # Assert
    assert "access_token" in response.cookies
    assert "refresh_token" in response.cookies


async def test_register_returns_409_for_duplicate_email(client):
    # Arrange
    await client.post("/api/auth/register", json=REGISTER_PAYLOAD)

    # Act
    response = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)

    # Assert
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "DUPLICATE_EMAIL"


async def test_login_returns_200_with_valid_credentials(client):
    # Arrange
    await client.post("/api/auth/register", json=REGISTER_PAYLOAD)

    # Act
    response = await client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "TestPass123!",
    })

    # Assert
    assert response.status_code == 200
    assert response.json()["data"]["email"] == "test@example.com"


async def test_login_sets_auth_cookies(client):
    # Arrange
    await client.post("/api/auth/register", json=REGISTER_PAYLOAD)

    # Act
    response = await client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "TestPass123!",
    })

    # Assert
    assert "access_token" in response.cookies
    assert "refresh_token" in response.cookies


async def test_login_returns_401_for_wrong_password(client):
    # Arrange
    await client.post("/api/auth/register", json=REGISTER_PAYLOAD)

    # Act
    response = await client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "WrongPass!",
    })

    # Assert
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "INVALID_CREDENTIALS"


async def test_login_returns_401_for_unknown_email(client):
    # Act
    response = await client.post("/api/auth/login", json={
        "email": "nobody@example.com",
        "password": "TestPass123!",
    })

    # Assert
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "INVALID_CREDENTIALS"


async def test_logout_returns_204(client):
    # Act
    response = await client.post("/api/auth/logout")

    # Assert
    assert response.status_code == 204


async def test_me_returns_current_user(client):
    # Arrange
    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    cookies = dict(reg.cookies)

    # Act
    response = await client.get("/api/auth/me", cookies=cookies)

    # Assert
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["email"] == "test@example.com"
    assert data["display_name"] == "Test User"


async def test_me_returns_401_without_auth(client):
    # Act
    response = await client.get("/api/auth/me")

    # Assert
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "MISSING_TOKEN"


async def test_me_returns_401_for_invalid_token(client):
    # Act
    response = await client.get("/api/auth/me", cookies={"access_token": "not.a.valid.token"})

    # Assert
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "INVALID_TOKEN"


async def test_refresh_issues_new_access_token(client):
    # Arrange
    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    refresh_token = reg.cookies["refresh_token"]

    # Act
    response = await client.post(
        "/api/auth/refresh",
        cookies={"refresh_token": refresh_token},
    )

    # Assert
    assert response.status_code == 200
    assert "access_token" in response.cookies
    assert response.json()["data"]["email"] == "test@example.com"


async def test_refresh_returns_401_without_refresh_cookie(client):
    # Act
    response = await client.post("/api/auth/refresh")

    # Assert
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "MISSING_TOKEN"


async def test_refresh_returns_401_for_invalid_token(client):
    # Act
    response = await client.post(
        "/api/auth/refresh",
        cookies={"refresh_token": "bad.token.here"},
    )

    # Assert
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "INVALID_TOKEN"


async def test_refresh_returns_401_when_access_token_used_as_refresh(client):
    # Arrange
    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    access_token = reg.cookies["access_token"]

    # Act — pass access token where refresh token is expected
    with as_anonymous(client):
        response = await client.post(
            "/api/auth/refresh",
            cookies={"refresh_token": access_token},
        )

    # Assert
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "WRONG_TOKEN_TYPE"


# ---------------------------------------------------------------------------
# Forgot-password and reset-password endpoint tests
# ---------------------------------------------------------------------------

RESET_PAYLOAD = {
    "email": "test@example.com",
    "password": "TestPass123!",
    "display_name": "Test User",
}


async def test_forgot_password_returns_200_for_existing_user(client):
    # Arrange
    await client.post("/api/auth/register", json=RESET_PAYLOAD)

    # Act
    with patch(
        "notifications.email_service.email_service.send_password_reset_email",
        new_callable=AsyncMock,
    ) as mock_send:
        response = await client.post(
            "/api/auth/forgot-password", json={"email": "test@example.com"}
        )

    # Assert
    assert response.status_code == 200
    assert "reset link has been sent" in response.json()["data"]["message"]
    mock_send.assert_awaited_once()
    assert "reset_token" in response.cookies


async def test_forgot_password_returns_200_for_nonexistent_email(client):
    # Act — email that does not exist
    with patch(
        "notifications.email_service.email_service.send_password_reset_email",
        new_callable=AsyncMock,
    ) as mock_send:
        response = await client.post(
            "/api/auth/forgot-password", json={"email": "nobody@example.com"}
        )

    # Assert — same 200 response (no enumeration)
    assert response.status_code == 200
    assert "reset link has been sent" in response.json()["data"]["message"]
    mock_send.assert_not_awaited()


async def test_reset_password_success(client):
    # Arrange — register and request a reset token (token delivered via httpOnly cookie)
    await client.post("/api/auth/register", json=RESET_PAYLOAD)

    forgot_response = await client.post(
        "/api/auth/forgot-password", json={"email": "test@example.com"}
    )
    reset_token_cookie = forgot_response.cookies["reset_token"]

    # Act — reset the password using the cookie
    response = await client.post(
        "/api/auth/reset-password",
        json={"new_password": "NewPass456!"},
        cookies={"reset_token": reset_token_cookie},
    )

    # Assert
    assert response.status_code == 200
    assert response.json()["data"]["message"] == "Password reset successfully."

    # Verify the new password works for login
    login_response = await client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "NewPass456!"},
    )
    assert login_response.status_code == 200


async def test_reset_password_returns_400_for_missing_cookie(client):
    # Act — no reset_token cookie present
    response = await client.post(
        "/api/auth/reset-password",
        json={"new_password": "NewPass456!"},
    )

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "TOKEN_MISSING"


async def test_reset_password_returns_400_for_invalid_token(client):
    # Act — reset_token cookie with a value that was never issued
    response = await client.post(
        "/api/auth/reset-password",
        json={"new_password": "NewPass456!"},
        cookies={"reset_token": "deadbeef" * 8},
    )

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "TOKEN_INVALID"


async def test_reset_password_returns_400_for_expired_token(client):
    # Arrange — register and inject an already-expired token directly into DB
    await client.post("/api/auth/register", json=RESET_PAYLOAD)

    import hashlib
    raw_token = "a" * 64
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expired_at = datetime.now(timezone.utc) - timedelta(hours=2)

    users = database.get_collection("users")
    await users.update_one(
        {"email": "test@example.com"},
        {"$set": {"reset_token_hash": token_hash, "reset_token_expires_at": expired_at}},
    )

    # Act — send expired raw token via cookie
    response = await client.post(
        "/api/auth/reset-password",
        json={"new_password": "NewPass456!"},
        cookies={"reset_token": raw_token},
    )

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "TOKEN_EXPIRED"


# ---------------------------------------------------------------------------
# PATCH /api/auth/me — update default_stages
# ---------------------------------------------------------------------------


async def test_patch_me_updates_default_stages(client):
    # Arrange
    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    cookies = dict(reg.cookies)

    # Act
    response = await client.patch(
        "/api/auth/me",
        json={"default_stages": ["Applied", "Technical", "Final Round", "Offer", "Rejected"]},
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["default_stages"] == ["Applied", "Technical", "Final Round", "Offer", "Rejected"]


async def test_patch_me_returns_422_for_more_than_10_stages(client):
    # Arrange
    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    cookies = dict(reg.cookies)
    too_many = [f"Stage {i}" for i in range(11)]

    # Act
    response = await client.patch(
        "/api/auth/me",
        json={"default_stages": too_many},
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 422


async def test_patch_me_returns_422_for_fewer_than_2_stages(client):
    # Arrange
    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    cookies = dict(reg.cookies)

    # Act
    response = await client.patch(
        "/api/auth/me",
        json={"default_stages": ["OnlyOne"]},
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 422


async def test_patch_me_returns_401_without_auth(client):
    # Act
    response = await client.patch(
        "/api/auth/me",
        json={"default_stages": ["Applied", "Rejected"]},
    )

    # Assert
    assert response.status_code == 401


async def test_patch_me_rejects_invalid_timezone(client):
    # Arrange
    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    cookies = dict(reg.cookies)

    # Act
    response = await client.patch(
        "/api/auth/me",
        json={"timezone": "Not/AReal_Zone"},
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 422


async def test_patch_me_updates_timezone(client):
    # Arrange
    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    cookies = dict(reg.cookies)

    # Act
    response = await client.patch(
        "/api/auth/me",
        json={"timezone": "America/Los_Angeles"},
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 200
    assert response.json()["data"]["timezone"] == "America/Los_Angeles"


# ── Resume endpoints ──────────────────────────────────────────────────────────

def _minimal_pdf() -> bytes:
    """Return a minimal PDF with extractable text for testing."""
    return (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]\n"
        b"   /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n\n"
        b"4 0 obj\n<< /Length 44 >>\nstream\n"
        b"BT /F1 12 Tf 72 720 Td (Hello World) Tj ET\n"
        b"endstream\nendobj\n\n"
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n\n"
        b"xref\n0 6\n"
        b"0000000000 65535 f \n"
        b"0000000009 00000 n \n"
        b"0000000058 00000 n \n"
        b"0000000115 00000 n \n"
        b"0000000266 00000 n \n"
        b"0000000360 00000 n \n\n"
        b"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n441\n%%EOF"
    )


async def test_upload_resume_sets_has_resume(client):
    # Arrange
    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    cookies = dict(reg.cookies)

    # Act
    response = await client.post(
        "/api/auth/resume",
        files={"file": ("resume.pdf", _minimal_pdf(), "application/pdf")},
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 200
    me = await client.get("/api/auth/me", cookies=cookies)
    assert me.json()["data"]["has_resume"] is True


async def test_upload_resume_rejects_non_pdf(client):
    # Arrange
    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    cookies = dict(reg.cookies)

    # Act
    response = await client.post(
        "/api/auth/resume",
        files={"file": ("resume.txt", b"plain text", "text/plain")},
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 400


async def test_delete_resume_clears_has_resume(client):
    # Arrange
    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    cookies = dict(reg.cookies)
    await client.post(
        "/api/auth/resume",
        files={"file": ("resume.pdf", _minimal_pdf(), "application/pdf")},
        cookies=cookies,
    )

    # Act
    response = await client.delete("/api/auth/resume", cookies=cookies)

    # Assert
    assert response.status_code == 204
    me = await client.get("/api/auth/me", cookies=cookies)
    assert me.json()["data"]["has_resume"] is False


async def test_upload_resume_requires_auth(client):
    # Act
    response = await client.post(
        "/api/auth/resume",
        files={"file": ("resume.pdf", _minimal_pdf(), "application/pdf")},
    )

    # Assert
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Email verification — POST /api/auth/verify-email
# ---------------------------------------------------------------------------


async def test_register_sets_email_verified_false(client):
    # Act
    response = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)

    # Assert
    assert response.status_code == 201
    assert response.json()["data"]["email_verified"] is False


async def test_verify_email_with_valid_token(client):
    # Arrange
    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    user_id = reg.json()["data"]["id"]
    users = database.get_collection("users")
    from bson import ObjectId
    user_doc = await users.find_one({"_id": ObjectId(user_id)})
    raw_token_hash = user_doc["verification_token_hash"]

    # Find the raw token by generating a new one via create_verification_token
    # We read the token hash directly and call the service to get the raw token
    import hashlib, secrets
    raw = secrets.token_hex(32)
    token_hash = hashlib.sha256(raw.encode()).hexdigest()
    await users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"verification_token_hash": token_hash}},
    )

    # Act
    response = await client.post("/api/auth/verify-email", json={"token": raw})

    # Assert
    assert response.status_code == 200
    assert response.json()["data"]["message"] == "Email verified"
    doc = await users.find_one({"_id": ObjectId(user_id)})
    assert doc["email_verified"] is True
    assert "verification_token_hash" not in doc


async def test_verify_email_with_invalid_token(client):
    # Act
    response = await client.post("/api/auth/verify-email", json={"token": "a" * 64})

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "TOKEN_INVALID"


async def test_verify_email_with_expired_token(client):
    # Arrange
    from datetime import datetime, timedelta, timezone
    from bson import ObjectId
    import hashlib, secrets

    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    user_id = reg.json()["data"]["id"]
    users = database.get_collection("users")
    raw = secrets.token_hex(32)
    token_hash = hashlib.sha256(raw.encode()).hexdigest()
    expired_at = datetime.now(timezone.utc) - timedelta(hours=1)
    await users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"verification_token_hash": token_hash, "verification_token_expires_at": expired_at}},
    )

    # Act
    response = await client.post("/api/auth/verify-email", json={"token": raw})

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "TOKEN_EXPIRED"


async def test_unverified_user_blocked_from_applications(client):
    # Arrange
    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    cookies = dict(reg.cookies)

    # Act — unverified user tries to list applications
    response = await client.get("/api/applications", cookies=cookies)

    # Assert
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "EMAIL_NOT_VERIFIED"


async def test_resend_verification_rate_limit(client):
    # Arrange
    from bson import ObjectId
    from datetime import datetime, timezone

    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    cookies = dict(reg.cookies)
    user_id = reg.json()["data"]["id"]

    # Exhaust the rate limit in the DB directly
    users = database.get_collection("users")
    await users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"verification_resend_count": 3, "verification_resend_window_start": datetime.now(timezone.utc)}},
    )

    # Act
    response = await client.post("/api/auth/resend-verification", cookies=cookies)

    # Assert
    assert response.status_code == 429


# ---------------------------------------------------------------------------
# Referral system — US-109
# ---------------------------------------------------------------------------


async def test_register_returns_referral_code(client):
    # Act
    response = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)

    # Assert
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["referral_code"] is not None
    assert len(data["referral_code"]) > 0
    assert data["referral_count"] == 0


async def test_register_with_valid_referral_code_increments_referrer(client):
    # Arrange — register referrer first to get their code
    referrer_resp = await client.post(
        "/api/auth/register",
        json={"email": "referrer@example.com", "password": "TestPass123!", "display_name": "Referrer"},
    )
    assert referrer_resp.status_code == 201
    referrer_code = referrer_resp.json()["data"]["referral_code"]
    referrer_cookies = dict(referrer_resp.cookies)

    # Act — register a new user using the referrer's code
    response = await client.post(
        "/api/auth/register",
        json={
            "email": "referred@example.com",
            "password": "TestPass123!",
            "display_name": "Referred User",
            "referral_code": referrer_code,
        },
    )

    # Assert — new user created
    assert response.status_code == 201

    # Assert — referrer's count incremented
    me_resp = await client.get("/api/auth/me", cookies=referrer_cookies)
    assert me_resp.json()["data"]["referral_count"] == 1


async def test_register_with_invalid_referral_code_silently_ignored(client):
    # Act — provide a referral code that doesn't exist
    response = await client.post(
        "/api/auth/register",
        json={
            "email": "new@example.com",
            "password": "TestPass123!",
            "display_name": "New User",
            "referral_code": "BADCODE99",
        },
    )

    # Assert — registration still succeeds
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["referral_count"] == 0


async def test_me_returns_referral_fields(client):
    # Arrange
    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    cookies = dict(reg.cookies)

    # Act
    response = await client.get("/api/auth/me", cookies=cookies)

    # Assert
    assert response.status_code == 200
    data = response.json()["data"]
    assert "referral_code" in data
    assert "referral_count" in data
    assert data["referral_count"] == 0


async def test_change_password_success(client):
    # Arrange
    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    cookies = dict(reg.cookies)

    # Act
    response = await client.post(
        "/api/auth/change-password",
        json={"current_password": "TestPass123!", "new_password": "NewPass456!"},
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 200
    assert response.json()["data"]["message"] == "Password changed"


async def test_change_password_wrong_current(client):
    # Arrange
    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    cookies = dict(reg.cookies)

    # Act
    response = await client.post(
        "/api/auth/change-password",
        json={"current_password": "WrongPass123!", "new_password": "NewPass456!"},
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "CURRENT_PASSWORD_INCORRECT"


async def test_change_password_too_weak(client):
    # Arrange
    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    cookies = dict(reg.cookies)

    # Act
    response = await client.post(
        "/api/auth/change-password",
        json={"current_password": "TestPass123!", "new_password": "alllowercase1"},
        cookies=cookies,
    )

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "PASSWORD_TOO_WEAK"


async def test_change_password_unauthenticated(client):
    # Act
    from tests.conftest import as_anonymous
    with as_anonymous(client):
        response = await client.post(
            "/api/auth/change-password",
            json={"current_password": "TestPass123!", "new_password": "NewPass456!"},
        )

    # Assert
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# DELETE /api/auth/me — account deletion
# ---------------------------------------------------------------------------


async def test_delete_account_success(client):
    from bson import ObjectId
    from datetime import timezone

    # Arrange — register and seed data across all cascade collections
    reg = await client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    cookies = dict(reg.cookies)
    user_id = reg.json()["data"]["id"]
    oid = ObjectId(user_id)
    now = datetime.now(timezone.utc)

    await database.get_collection("applications").insert_one({"user_id": user_id, "company": "Acme"})
    await database.get_collection("calendar_events").insert_one({"user_id": user_id, "title": "Interview"})
    await database.get_collection("contacts").insert_one({"user_id": user_id, "name": "Jane"})
    await database.get_collection("saved_searches").insert_one({"user_id": oid, "query": "python"})
    await database.get_collection("notifications").insert_one({"user_id": oid, "message": "Test"})
    await database.get_collection("user_custom_fields").insert_one({"user_id": oid, "label": "Field"})
    await database.get_collection("shares").insert_one({"user_id": oid, "slug": "abc", "is_active": True, "expires_at": now})
    await database.get_collection("application_templates").insert_one({"user_id": oid, "name": "Template"})

    # Act
    response = await client.delete("/api/auth/me", cookies=cookies)

    # Assert HTTP response
    assert response.status_code == 204
    assert "access_token" not in response.cookies or response.cookies.get("access_token") == ""

    # Assert all collections are empty for this user
    assert await database.get_collection("users").find_one({"_id": oid}) is None
    assert await database.get_collection("applications").find_one({"user_id": user_id}) is None
    assert await database.get_collection("calendar_events").find_one({"user_id": user_id}) is None
    assert await database.get_collection("contacts").find_one({"user_id": user_id}) is None
    assert await database.get_collection("saved_searches").find_one({"user_id": oid}) is None
    assert await database.get_collection("notifications").find_one({"user_id": oid}) is None
    assert await database.get_collection("user_custom_fields").find_one({"user_id": oid}) is None
    assert await database.get_collection("shares").find_one({"user_id": oid}) is None
    assert await database.get_collection("application_templates").find_one({"user_id": oid}) is None


async def test_delete_account_unauthenticated(client):
    # Act
    from tests.conftest import as_anonymous
    with as_anonymous(client):
        response = await client.delete("/api/auth/me")

    # Assert
    assert response.status_code == 401


async def test_get_me_includes_morning_brief_defaults(client):
    reg = await client.post("/api/auth/register", json={
        "email": "brief_defaults@example.com",
        "password": "password123",
        "display_name": "Brief Defaults",
    })
    cookies = dict(reg.cookies)

    response = await client.get("/api/auth/me", cookies=cookies)

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["morning_brief_enabled"] is True
    assert data["morning_brief_hour"] == 8
    assert data["morning_brief_email"] is True
    assert data["morning_brief_in_app"] is True
    assert data["weekly_digest_enabled"] is False


async def test_patch_me_updates_morning_brief_preferences(client):
    reg = await client.post("/api/auth/register", json={
        "email": "brief_prefs@example.com",
        "password": "password123",
        "display_name": "Brief Prefs",
    })
    cookies = dict(reg.cookies)

    response = await client.patch(
        "/api/auth/me",
        json={
            "morning_brief_enabled": False,
            "morning_brief_email": False,
            "weekly_digest_enabled": True,
        },
        cookies=cookies,
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["morning_brief_enabled"] is False
    assert data["morning_brief_email"] is False
    assert data["weekly_digest_enabled"] is True
    assert data["digest_enabled"] is True


async def test_legacy_digest_enabled_maps_to_weekly_digest(client):
    from bson import ObjectId
    import database

    reg = await client.post("/api/auth/register", json={
        "email": "legacy_digest@example.com",
        "password": "password123",
        "display_name": "Legacy User",
    })
    cookies = dict(reg.cookies)
    user_id = reg.json()["data"]["id"]

    users = database.get_collection("users")
    await users.update_one(
        {"_id": ObjectId(user_id)},
        {"$unset": {"weekly_digest_enabled": ""}, "$set": {"digest_enabled": True}},
    )

    response = await client.get("/api/auth/me", cookies=cookies)

    assert response.status_code == 200
    assert response.json()["data"]["weekly_digest_enabled"] is True
