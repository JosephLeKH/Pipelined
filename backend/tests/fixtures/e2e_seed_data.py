"""E2E test data seeding fixture for Playwright tests.

This module seeds a test user and test applications into MongoDB for E2E testing.
It can be run as a standalone script or imported as a pytest fixture.

Usage:
    python -m tests.fixtures.e2e_seed_data --create   # Seed test data
    python -m tests.fixtures.e2e_seed_data --cleanup  # Wipe test data
    pytest tests/ --use-e2e-seed                      # Use as pytest fixture

Seeded user:
    email: e2e-test@example.com
    password: TestPass123!
    display_name: E2E Test User

Seeded applications:
    - 5 test applications in various stages (Interested, Applied, Interview, etc.)
"""

import asyncio
import argparse
from datetime import datetime, timezone
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from bson import ObjectId

import database
from database import connect, disconnect, ensure_indexes
from auth.service import hash_password


TEST_USER_EMAIL = "e2e-test@example.com"
TEST_USER_PASSWORD = "TestPass123!"
TEST_USER_DISPLAY_NAME = "E2E Test User"

TEST_APPLICATIONS = [
    {
        "role_title": "Senior Software Engineer",
        "company": "TechCorp",
        "stage": "Interested",
        "source": "manual",
    },
    {
        "role_title": "Product Manager",
        "company": "InnovateCo",
        "stage": "Applied",
        "source": "manual",
    },
    {
        "role_title": "Data Scientist",
        "company": "DataInc",
        "stage": "Interview",
        "source": "manual",
    },
    {
        "role_title": "Full Stack Engineer",
        "company": "WebSolutions",
        "stage": "Offer",
        "source": "manual",
    },
    {
        "role_title": "DevOps Engineer",
        "company": "CloudSystems",
        "stage": "Rejected",
        "source": "manual",
    },
]


async def seed_test_user() -> str:
    """Create or update test user in MongoDB. Returns user ID as string."""
    if database.db is None:
        raise RuntimeError("Database not connected")

    user_id = ObjectId()
    user_doc = {
        "_id": user_id,
        "email": TEST_USER_EMAIL,
        "hashed_password": hash_password(TEST_USER_PASSWORD),
        "display_name": TEST_USER_DISPLAY_NAME,
        "email_verified": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        # Default prefs
        "timezone": "America/Los_Angeles",
        "morning_brief_enabled": True,
        "morning_brief_hour": 8,
        "weekly_digest_enabled": True,
        "autopilot_enabled": False,
        "watchlist_enabled": False,
    }

    # Upsert: replace if exists (by email), or insert new
    result = await database.db["users"].update_one(
        {"email": TEST_USER_EMAIL},
        {"$set": user_doc},
        upsert=True,
    )

    # Fetch the actual user ID (may be existing or new)
    user = await database.db["users"].find_one({"email": TEST_USER_EMAIL})
    if user is None:
        raise RuntimeError("Failed to seed test user")

    return str(user["_id"])


async def seed_test_applications(user_id: str) -> list[str]:
    """Create 5 test applications for the test user. Returns list of application IDs."""
    if database.db is None:
        raise RuntimeError("Database not connected")

    app_ids = []
    for i, app_data in enumerate(TEST_APPLICATIONS):
        app_id = ObjectId()
        app_doc = {
            "_id": app_id,
            "user_id": ObjectId(user_id),
            **app_data,
            "url": f"https://example.com/job/{i+1}",
            "notes": f"Test application {i+1}",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "deleted": False,
        }
        await database.db["applications"].insert_one(app_doc)
        app_ids.append(str(app_id))

    return app_ids


async def cleanup_test_data() -> None:
    """Wipe test user and applications from MongoDB."""
    if database.db is None:
        raise RuntimeError("Database not connected")

    # Delete test user and cascade
    result = await database.db["users"].delete_one({"email": TEST_USER_EMAIL})
    deleted_user_count = result.deleted_count

    # Delete test applications by user (if user still exists, query would be empty)
    # For safety, also delete by company names
    result = await database.db["applications"].delete_many({
        "company": {
            "$in": [app["company"] for app in TEST_APPLICATIONS]
        }
    })
    deleted_app_count = result.deleted_count

    print(f"Cleaned up: {deleted_user_count} user(s), {deleted_app_count} application(s)")


async def main() -> None:
    """CLI entry point: parse args and seed or cleanup."""
    parser = argparse.ArgumentParser(description="E2E test data seeding utility")
    parser.add_argument(
        "--create",
        action="store_true",
        help="Seed test data into MongoDB",
    )
    parser.add_argument(
        "--cleanup",
        action="store_true",
        help="Wipe test data from MongoDB",
    )
    args = parser.parse_args()

    await connect()
    await ensure_indexes()

    try:
        if args.create:
            print("Seeding E2E test data...")
            user_id = await seed_test_user()
            print(f"Created test user: {TEST_USER_EMAIL} (ID: {user_id})")

            app_ids = await seed_test_applications(user_id)
            print(f"Created {len(app_ids)} test applications")

        elif args.cleanup:
            print("Cleaning up E2E test data...")
            await cleanup_test_data()
        else:
            parser.print_help()

    finally:
        await disconnect()


# Pytest fixture: auto-seed data for tests decorated with @pytest.mark.e2e
@pytest_asyncio.fixture
async def e2e_test_user() -> AsyncGenerator[str, None]:
    """Pytest fixture: seed test user, yield user ID, cleanup after."""
    await connect()
    await ensure_indexes()

    try:
        user_id = await seed_test_user()
        yield user_id
    finally:
        await cleanup_test_data()
        await disconnect()


@pytest_asyncio.fixture
async def e2e_test_applications(e2e_test_user: str) -> AsyncGenerator[list[str], None]:
    """Pytest fixture: seed applications for test user, yield app IDs, cleanup after."""
    app_ids = await seed_test_applications(e2e_test_user)
    yield app_ids


if __name__ == "__main__":
    asyncio.run(main())
