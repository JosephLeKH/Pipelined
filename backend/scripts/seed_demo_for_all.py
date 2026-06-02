"""One-off CLI: backfill demo data for every existing user.

Usage:
    cd backend
    python -m scripts.seed_demo_for_all

Idempotent — users that already have demo data are skipped. Prints a summary
of scanned / seeded / skipped / errors to stdout.

Also runs automatically on backend startup via main.py lifespan (so a redeploy
covers this without a manual run). The CLI exists for local testing or to
force a backfill outside of a restart cycle.
"""

import asyncio
import sys

import structlog

from database import connect, disconnect
from seed.demo_data import backfill_demo_for_all_users

logger = structlog.get_logger()


async def main() -> int:
    await connect()
    try:
        summary = await backfill_demo_for_all_users()
        print(
            f"Backfill complete: scanned={summary['scanned']} "
            f"seeded={summary['seeded']} skipped={summary['skipped']} "
            f"errors={summary['errors']}"
        )
        return 0 if summary["errors"] == 0 else 1
    finally:
        await disconnect()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
