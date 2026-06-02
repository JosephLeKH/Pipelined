"""Tests for CSRF middleware bearer-token bypass.

Extension/API clients authenticate via `Authorization: Bearer <jwt>`, which is
not vulnerable to CSRF (cookies aren't auto-attached cross-origin in a non-
browser context). The CSRF middleware must skip the double-submit check for
those requests so the extension can save without first acquiring a CSRF cookie.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from auth.service import create_access_token
from middleware.csrf import CSRF_COOKIE_NAME

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_post_with_bearer_token_bypasses_csrf(app):
    """POST to a mutating endpoint with Bearer auth skips CSRF and reaches auth."""
    transport = ASGITransport(app=app)
    token = create_access_token("507f1f77bcf86cd799439011")

    async with AsyncClient(transport=transport, base_url="http://test") as c:
        response = await c.post(
            "/api/applications",
            headers={"Authorization": f"Bearer {token}"},
            json={"company": "Acme", "role_title": "SWE"},
        )

    # We expect 401 because the user doesn't actually exist — but importantly
    # NOT 403 CSRF_TOKEN_MISMATCH. That proves the middleware let the request
    # through to the route handler.
    assert response.status_code != 403, response.text
    if response.status_code == 403:
        assert response.json().get("error", {}).get("code") != "CSRF_TOKEN_MISMATCH"


async def test_post_with_malformed_bearer_still_enforces_csrf(app):
    """A garbage Bearer value must NOT bypass CSRF — only well-formed tokens do."""
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as c:
        response = await c.post(
            "/api/applications",
            headers={"Authorization": "Bearer not-a-jwt"},
            json={"company": "Acme", "role_title": "SWE"},
        )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "CSRF_TOKEN_MISMATCH"


async def test_post_without_bearer_still_enforces_csrf(app):
    """Anonymous / cookie-auth POST without CSRF still returns 403."""
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as c:
        response = await c.post("/api/applications", json={"company": "Acme"})

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "CSRF_TOKEN_MISMATCH"
