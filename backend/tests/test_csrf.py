"""Tests for CSRF middleware: double-submit cookie protection."""

import pytest
from httpx import ASGITransport, AsyncClient

from middleware.csrf import CSRF_COOKIE_NAME, CSRF_HEADER_NAME

pytestmark = pytest.mark.asyncio(loop_scope="session")

_CSRF_TOKEN = "b" * 64


async def test_post_without_csrf_token_returns_403(app):
    """POST to a protected endpoint without any CSRF token returns 403."""
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as c:
        response = await c.post("/api/auth/logout")

    assert response.status_code == 403
    body = response.json()
    assert body["error"]["code"] == "CSRF_TOKEN_MISMATCH"


async def test_post_with_matching_csrf_token_passes(app):
    """POST with matching cookie and header bypasses CSRF check."""
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as c:
        c.cookies.set(CSRF_COOKIE_NAME, _CSRF_TOKEN)
        response = await c.post(
            "/api/auth/logout",
            headers={CSRF_HEADER_NAME: _CSRF_TOKEN},
        )

    # logout is 204 even without auth cookies; confirms CSRF check passed
    assert response.status_code == 204


async def test_post_with_mismatched_csrf_token_returns_403(app):
    """POST with cookie and header that differ returns 403."""
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as c:
        c.cookies.set(CSRF_COOKIE_NAME, "correct-token-aaaa")
        response = await c.post(
            "/api/auth/logout",
            headers={CSRF_HEADER_NAME: "wrong-token-bbbb"},
        )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "CSRF_TOKEN_MISMATCH"


async def test_post_with_header_only_no_cookie_returns_403(app):
    """POST with header but no cookie returns 403."""
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as c:
        response = await c.post(
            "/api/auth/logout",
            headers={CSRF_HEADER_NAME: _CSRF_TOKEN},
        )

    assert response.status_code == 403


async def test_get_request_requires_no_csrf(app):
    """GET requests are never blocked by CSRF middleware."""
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as c:
        response = await c.get("/health")

    assert response.status_code == 200


async def test_login_exempt_from_csrf(app):
    """POST /api/auth/login is exempt — returns 401 (bad creds) not 403."""
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as c:
        response = await c.post(
            "/api/auth/login",
            json={"email": "nobody@example.com", "password": "wrong"},
        )

    assert response.status_code == 401


async def test_register_exempt_from_csrf(app):
    """POST /api/auth/register is exempt — returns 201 without CSRF token."""
    import uuid

    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as c:
        email = f"csrf-{uuid.uuid4().hex[:8]}@example.com"
        response = await c.post(
            "/api/auth/register",
            json={"email": email, "password": "TestPass123!", "display_name": "CSRF Test"},
        )

    assert response.status_code == 201


async def test_patch_without_csrf_token_returns_403(app):
    """PATCH to a protected endpoint without CSRF token returns 403."""
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as c:
        response = await c.patch("/api/auth/me", json={"default_stages": []})

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "CSRF_TOKEN_MISMATCH"


async def test_delete_without_csrf_token_returns_403(app):
    """DELETE to a protected endpoint without CSRF token returns 403."""
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as c:
        response = await c.delete("/api/applications/nonexistent-id")

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "CSRF_TOKEN_MISMATCH"
