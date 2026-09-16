"""Safe, dependency-free error reporting hook for local and production use."""
import logging

logger = logging.getLogger("uvicorn.error")


def capture_exception(error: Exception, *, source: str) -> None:
    # Keep request data, cookies and exception details out of the log payload.
    logger.error("Unhandled application error source=%s type=%s", source, type(error).__name__)
