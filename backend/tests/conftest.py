"""Shared test fixtures: async test client and database lifecycle."""

import pytest
import pytest_asyncio
from bson import ObjectId
from httpx import ASGITransport, AsyncClient

import database
from database import connect, disconnect, ensure_indexes
from main import create_app
from middleware.csrf import CSRF_COOKIE_NAME, CSRF_HEADER_NAME
from middleware.rate_limit import limiter

TEST_CSRF_TOKEN = "a" * 64  # 32-byte equivalent; matches cookie + header


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def app():
    """Create the FastAPI app, wipe all collections once, then connect."""
    limiter.enabled = False
    from config import settings as _settings
    _settings.disable_tier_limits = True
    application = create_app(testing=True)
    await connect()
    await ensure_indexes()
    if database.db is not None:
        for name in await database.db.list_collection_names():
            await database.db[name].delete_many({})
    yield application
    await disconnect()
    limiter.enabled = True


@pytest_asyncio.fixture(autouse=True, loop_scope="session")
async def clean_db():
    """Wipe all collections before each test."""
    if database.db is not None:
        for name in await database.db.list_collection_names():
            await database.db[name].delete_many({})


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def client(app):
    """Async HTTP client bound to the test app with CSRF token pre-set."""
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={CSRF_HEADER_NAME: TEST_CSRF_TOKEN},
    ) as c:
        c.cookies.set(CSRF_COOKIE_NAME, TEST_CSRF_TOKEN)
        yield c


from contextlib import contextmanager


@contextmanager
def as_user(client, cookies: dict):
    """Temporarily swap the client's cookie jar to act as a specific user.

    httpx 0.28 deprecated per-request cookies=, so tests that need multi-user
    isolation must swap the client's cookie jar directly.
    """
    saved = list(client.cookies.jar)
    client.cookies.clear()
    client.cookies.set(CSRF_COOKIE_NAME, TEST_CSRF_TOKEN)
    for k, v in cookies.items():
        client.cookies.set(k, v)
    try:
        yield
    finally:
        client.cookies.clear()
        for morsel in saved:
            client.cookies.jar.set_cookie(morsel)


@contextmanager
def as_anonymous(client):
    """Temporarily clear all auth cookies so requests appear unauthenticated."""
    saved = list(client.cookies.jar)
    client.cookies.clear()
    client.cookies.set(CSRF_COOKIE_NAME, TEST_CSRF_TOKEN)
    try:
        yield
    finally:
        client.cookies.clear()
        for morsel in saved:
            client.cookies.jar.set_cookie(morsel)


async def verify_user_by_id(user_id: str) -> None:
    """Set email_verified=True for a user document (test helper, not a fixture)."""
    if database.db is not None:
        await database.db["users"].update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"email_verified": True}},
        )


@pytest_asyncio.fixture(loop_scope="session")
async def test_user(client):
    """Register a user via /api/auth/register, auto-verify, and return (user_doc, cookies)."""
    response = await client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "TestPass123!",
        "display_name": "Test User",
    })
    user = response.json()["data"]
    cookies = dict(response.cookies)
    await verify_user_by_id(user["id"])
    return user, cookies


@pytest_asyncio.fixture(loop_scope="session")
async def other_user(client):
    """Register a second user for isolation/permission tests."""
    response = await client.post("/api/auth/register", json={
        "email": "other@example.com",
        "password": "TestPass123!",
        "display_name": "Other User",
    })
    user = response.json()["data"]
    cookies = dict(response.cookies)
    await verify_user_by_id(user["id"])
    return user, cookies


@pytest_asyncio.fixture(loop_scope="session")
async def test_app_id(client, test_user):
    """Create a test application and return its ID."""
    user, cookies = test_user
    response = await client.post("/api/applications", json={
        "role_title": "Software Engineer",
        "company": "Test Company",
        "source": "manual",
    }, cookies=cookies)
    app = response.json()["data"]
    return app["id"]
