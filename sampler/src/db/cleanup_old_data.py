"""
Cleanup script to remove old data.
Run this script as a daemon on systemd to prevent database from growing indefinitely.
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
            # 1. Check if table exists
            table_check = await session.execute(
                text("""
                    SELECT name
                    FROM sqlite_master
                    WHERE type='table' AND name='sensor_samples'
                """)
            )

            if table_check.scalar() is None:
                log.warning("Table 'sensor_samples' does not exist. Skipping cleanup.")
                return

            # 2. Delete old data
            result = await session.execute(
                text("""
                    DELETE FROM sensor_samples
                    WHERE timestamp < :cutoff
                """),
                {"cutoff": cutoff_timestamp}
            )

            await session.commit()
            deleted_count = result.rowcount or 0

        # 3. Vacuum only if something was deleted
        if deleted_count > 0:
            async with db.engine.begin() as conn:
                await conn.execute(text("VACUUM"))

            log.warning(f"Cleanup complete: Removed {deleted_count} samples older than {Config.DATA_RETENTION_DAYS} days.")
            log.warning(f"Cutoff date: {datetime.fromtimestamp(cutoff_timestamp)}")
    except Exception as e:
        log.error(f"Error while cleaning DB: {e}")
    finally:
        await db.close()

if __name__ == "__main__":
    asyncio.run(cleanup_old_data())