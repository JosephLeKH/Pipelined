"""Shared test fixtures: async test client and database lifecycle."""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from database import connect, disconnect, db
from main import create_app


@pytest_asyncio.fixture(scope="session")
async def app():
    """Create the FastAPI app and connect to the test database."""
    application = create_app()
    await connect()
    yield application
    await disconnect()


@pytest_asyncio.fixture(autouse=True)
async def clean_db():
    """Wipe all collections before each test."""
    if db is not None:
        for name in await db.list_collection_names():
            await db[name].delete_many({})


@pytest_asyncio.fixture
async def client(app):
    """Async HTTP client bound to the test app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
