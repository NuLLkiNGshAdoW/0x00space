"""Privacy-conscious error reporting for local and production use."""
import logging

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

logger = logging.getLogger("uvicorn.error")
_sentry_enabled = False


def configure_monitoring(dsn: str, environment: str, release: str = "") -> None:
    global _sentry_enabled
    _sentry_enabled = bool(dsn)
    if not _sentry_enabled:
        return

    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        release=release or None,
        send_default_pii=False,
        max_request_body_size="never",
        before_send=sanitize_sentry_event,
        integrations=[FastApiIntegration()],
    )


def capture_exception(error: Exception, *, source: str) -> None:
    logger.error(
        "Unhandled application error source=%s type=%s",
        _safe_source(source),
        type(error).__name__,
    )
    if not _sentry_enabled:
        return

    with sentry_sdk.push_scope() as scope:
        scope.set_tag("source", _safe_source(source))
        sentry_sdk.capture_exception(error)


def sanitize_sentry_event(event, hint):
    event.pop("user", None)
    event.pop("extra", None)
    event.pop("breadcrumbs", None)
    event.pop("transaction", None)
    event["message"] = "Application error"

    exception = event.get("exception", {})
    for value in exception.get("values", []):
        value["value"] = value.get("type") or "Error"

    request = event.get("request")
    if request:
        method = request.get("method")
        event["request"] = {"method": method} if method else {}

    return event


def _safe_source(source: str) -> str:
    if source.isascii() and source.replace("_", "").replace("-", "").isalnum() and len(source) <= 48:
        return source
    return "http_request"
