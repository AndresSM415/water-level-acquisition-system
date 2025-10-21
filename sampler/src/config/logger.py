import logging
from logging.handlers import RotatingFileHandler
from src.config import Config

def configure_logger(
        name: str,
        log_file: str = Config.LOG_FILE,
        level: int = logging.INFO if Config.DEBUG else logging.WARNING
) -> logging.Logger:
    """
    Configure the root logger for the daemon to output messages
    to both console and log file.

    **Logging levels** (in ascending order of severity):
        1. **DEBUG**:    Detailed diagnostic information, useful for tracing execution.
        2. **INFO**:     Confirmation that things are working as expected; routine events.
        3. **WARNING**:  Indications of potential issues or unexpected situations.
        4. **ERROR**:    Serious problems that prevent a function or operation from completing.
        5. **CRITICAL**: Severe errors indicating the application may not be unable to continue.

    The default level is INFO. Each record will be formatted as:
        %(asctime)s [%(levelname)s] %(name)s: %(message)s
    where:
        - **asctime**:   Timestamp of the log record.
        - **levelname**: The log level (e.g., DEBUG, INFO).
        - **name**:      The logger’s name (here, the root logger).
        - **message**:   The actual log message.

    **Returns**:
        **logging.Logger**: The root logger instance, ready for use.
        Example:
            logger = setup_logger()
            logger.info("Service started")
            logger.error("An error occurred")
    """
    logger = logging.getLogger(name)
    if logger.hasHandlers():
        return logger

    logger.setLevel(level)

    fmt = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    datefmt = "%Y-%m-%d %H:%M:%S"
    formatter = logging.Formatter(fmt=fmt, datefmt=datefmt)

    # Consola
    ch = logging.StreamHandler()
    ch.setFormatter(formatter)
    logger.addHandler(ch)

    # Archivo con rotación
    fh = RotatingFileHandler(log_file, maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8")
    fh.setFormatter(formatter)
    logger.addHandler(fh)

    return logger
