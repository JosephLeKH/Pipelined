"""One-off CLI: backfill source_url + job_description on seeded demo apps.

Usage:
    cd backend
    python -m scripts.backfill_seed_extras

Iterates every user that has at least one seeded demo app, fills in the
new per-company extras (source_url, job_description) defined in
seed/extras.py. Idempotent — fields are only set when missing, so user
edits to a seeded application are never overwritten.

Same logic runs automatically inside seed_demo_data_for_user on startup,
so a redeploy already covers this. The CLI exists for ad-hoc backfill
or for verifying behavior locally.
"""

import asyncio
import sys

import structlog
from bson import ObjectId

from database import connect, disconnect, get_collection
from seed.applications import DEMO_MARKER
from seed.demo_data import _backfill_seed_extras

logger = structlog.get_logger()


async def main() -> int:
    await connect()
    try:
        apps = get_collection("applications")
        seeded_user_ids: list[ObjectId] = await apps.distinct(
            "user_id", {DEMO_MARKER: True}
        )

        scanned = 0
        users_patched = 0
        total_apps_patched = 0
        for uid in seeded_user_ids:
            scanned += 1
            patched = await _backfill_seed_extras(apps, uid)
            if patched:
                users_patched += 1
                total_apps_patched += patched

        print(
            f"Backfill complete: scanned={scanned} "
            f"users_patched={users_patched} apps_patched={total_apps_patched}"
        )
        return 0
    finally:
        await disconnect()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
