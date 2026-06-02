"""One-off CLI: seed demo data for an existing user account by email.

Usage:
    cd backend
    python -m scripts.seed_demo_for_user joseph@vimes.io

Idempotent — reruns are no-ops if the user already has seeded apps.
"""

import asyncio
import sys

import structlog

from auth.constants import DEFAULT_STAGES
from auth.service import get_user_by_email
from database import connect, disconnect
from seed.demo_data import seed_demo_data_for_user

logger = structlog.get_logger()


async def main(email: str) -> int:
    await connect()
    try:
        user = await get_user_by_email(email)
        if user is None:
            print(f"No user found with email: {email}", file=sys.stderr)
            return 1
        user_id = str(user["_id"])
        stages = user.get("default_stages", DEFAULT_STAGES)
        inserted = await seed_demo_data_for_user(user_id, stages)
        if inserted == 0:
            print(f"User {email} already has demo data (or seed failed silently — check logs).")
        else:
            print(f"Seeded {inserted} demo applications for {email}.")
        return 0
    finally:
        await disconnect()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python -m scripts.seed_demo_for_user <email>", file=sys.stderr)
        sys.exit(2)
    sys.exit(asyncio.run(main(sys.argv[1])))
