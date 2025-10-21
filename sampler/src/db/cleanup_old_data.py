"""
Cleanup script to remove old data.
Run this script as a daemon on systemd to prevent database from growing indefinitely.

Example executable (i.e. daily at 3 AM):
uv run /path/to/cleanup_old_data.py
"""
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import text

from src.config import Config, configure_logger
from src.db import Database
log = configure_logger("cleanup")

async def cleanup_old_data():
    """
    Delete sensor samples older than Config.DATA_RETENTION_DAYS.
    """
    db = Database()

    try:
        cutoff_timestamp = (datetime.now() - timedelta(days=Config.DATA_RETENTION_DAYS)).timestamp()

        async with db.get_session() as session:
            result = await session.execute(text(f"DELETE FROM sensor_samples WHERE timestamp < {cutoff_timestamp}"))
            await session.commit()
            deleted_count = result.rowcount

        async with db.engine.begin() as conn:
            await conn.execute(text("VACUUM"))

        log.warning(f"Cleanup complete: Removed {deleted_count} samples older than {Config.DATA_RETENTION_DAYS} days.")
        log.warning(f"Cutoff date: {datetime.fromtimestamp(cutoff_timestamp)}")
    finally:
        await db.close()

if __name__ == "__main__":
    asyncio.run(cleanup_old_data())