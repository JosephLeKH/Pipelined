"""Shared test fixtures: async test client and database lifecycle."""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

import database
from database import connect, disconnect, ensure_indexes
from main import create_app
from middleware.rate_limit import limiter


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def app():
    """Create the FastAPI app, wipe all collections once, then connect."""
    limiter.enabled = False
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
    """Async HTTP client bound to the test app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture(loop_scope="session")
async def test_user(client):
    """Register a user via /api/auth/register and return (user_doc, cookies)."""
    response = await client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "TestPass123!",
        "display_name": "Test User",
    })
    user = response.json()["data"]
    cookies = dict(response.cookies)
    return user, cookies
