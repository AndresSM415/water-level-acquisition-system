"""
Database models and session management for sensor data.
Uses SQLAlchemy with aiosqlite for async SQLite operations.
"""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import Float, Integer, Index, text

from src.config import Config, configure_logger


class Base(DeclarativeBase):
    """Base class for all database models."""
    pass

class SensorSample(Base):
    """Model for sensor data samples."""
    __tablename__ = "sensor_samples"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    timestamp: Mapped[float] = mapped_column(Float, nullable=False, index=True)

    # Tank Levels (voltage)
    tank1_voltage: Mapped[float] = mapped_column(Float, nullable=False)
    tank2_voltage: Mapped[float] = mapped_column(Float, nullable=False)
    tank3_voltage: Mapped[float] = mapped_column(Float, nullable=False)

    # Flow meters (L/s)
    flow1_lps: Mapped[float] = mapped_column(Float, nullable=False)
    flow1_pulses: Mapped[int] = mapped_column(Integer, nullable=False)
    flow2_lps: Mapped[float] = mapped_column(Float, nullable=False)
    flow2_pulses: Mapped[int] = mapped_column(Integer, nullable=False)

    # Hoses (duty cycle %)
    hose1_duty_cycle: Mapped[float] = mapped_column(Float, nullable=False)
    hose2_duty_cycle: Mapped[float] = mapped_column(Float, nullable=False)

    __table_args__ = (
        Index('ix_timestamp_desc', 'timestamp'),
    )

    def __repr__(self):
        return f"<SensorSample(id={self.id}. timestamp={self.timestamp})>"


class Database:
    """
    Database manager for sensor data.
    Handles connection, session management, and initialization.
    """

    def __init__(self):
        """
        Initialize database connection.
        """
        self.db_url = f"sqlite+aiosqlite:///{Config.DB_FILE}"
        # Create async engine with optimized settings for write-heavy workload.
        self.engine = create_async_engine(
            self.db_url,
            echo=False, # Set to True for SQL debugging
            pool_pre_ping=True,
            connect_args={"check_same_thread": False} # Allow SQLite access from multiple threads
        )

        # Session factory
        self.async_session = async_sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False
        )

    async def init_db(self) -> None:
        """Create all tables if they don't exist."""
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            await conn.execute(text("PRAGMA journal_mode=WAL"))
            await conn.execute(text("PRAGMA synchronous=NORMAL"))
            log.info(f"Database initialized at {self.db_url}")

    async def close(self) -> None:
        """Close database connection."""
        await self.engine.dispose()

    def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """
        Get a database session (use with async context manager).
        Usage:
            async with db.get_session() as session:
                # use session
        """
        return self.async_session()

    async def insert_sample(self, sample: dict) -> None:
        """
        Insert a single sample into the database.
        :param sample: Dictionary with sample data from SampleData.to_dict().
        """
        # async with self.async_session() as session:
        #     sample = SensorSample(**sample)
        #     session.add(sample)
        #     await session.commit()
        async with self.async_session.begin():  # begin() gives one tx
            async with self.async_session() as s:
                s.add(SensorSample(**sample))


log = configure_logger(Database.__name__)
