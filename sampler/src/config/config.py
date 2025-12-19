"""
Configuration management for the sensor system.
Loads settings from environment variables with sensible defaults.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Paths
    DB_PATH: str = os.getenv("DB_PATH")
    PROJECT_ROOT: str = os.getenv("ROOT_PATH")
    SAMPLER_ROOT: str = os.getenv("SAMPLER_ROOT")
    LOG_PATH: str = os.getenv("LOG_DIR")

    # Files
    DB_FILE: str = os.path.join(DB_PATH, os.getenv("DB_FILE"))
    LOG_FILE: str = os.path.join(LOG_PATH, os.getenv("LOG_FILE"))

    # Sampler configuration
    SAMPLE_INTERVAL: float = float(os.getenv("SAMPLE_INTERVAL"))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")

    # Data retention
    DATA_RETENTION_DAYS: int = int(os.getenv("DATA_RETENTION_DAYS", "30"))
    AUTO_CLEANUP_ENABLED: bool = os.getenv("AUTO_CLEANUP_ENABLED", "true").lower() in ("true", "1", "yes")

    # Raspberry Pi info
    @classmethod
    def validate(cls) -> None:
        """Validates configuration values."""
        if cls.SAMPLE_INTERVAL < 1:
            raise ValueError("sample interval must be at least 0.5 seconds")
        if cls.DATA_RETENTION_DAYS < 1:
            raise ValueError("data retention must be at least 1 day")

    @classmethod
    def ensure_dirs(cls) -> None:
        """
        Ensures that all directories exist.
        IF not, creates them and files are created by their own module.
        """
        Path(cls.DB_PATH).mkdir(parents=True, exist_ok=True)
        Path(cls.LOG_PATH).mkdir(parents=True, exist_ok=True)

    @classmethod
    def print_config(cls) -> None:
        """Print the current configuration (for debugging)."""
        print("\n" + "=" * 60)
        print("Configuration:")
        print("=" * 60)
        print(f"DB File:            {cls.DB_FILE}")
        print(f"Project Root:       {cls.PROJECT_ROOT}")
        print(f"Log File:           {cls.LOG_FILE}")
        print(f"Sample Interval:    {cls.SAMPLE_INTERVAL}s")
        print(f"Debug Mode:         {cls.DEBUG}")
        print(f"Data Retention:     {cls.DATA_RETENTION_DAYS} days")
        print(f"Auto Cleanup:       {cls.AUTO_CLEANUP_ENABLED}")
        print("=" * 60 + "\n")

    @staticmethod
    def load_env_file() -> None:
        Config.validate()
        Config.ensure_dirs()
        if Config.DEBUG:
                Config.print_config()