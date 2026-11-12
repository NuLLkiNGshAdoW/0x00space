from app.services.monitoring import _safe_source, sanitize_sentry_event


def test_sentry_event_removes_sensitive_request_and_exception_data():
    event = {
        "user": {"email": "private@example.test"},
        "extra": {"password": "secret"},
        "breadcrumbs": [{"message": "submitted private form data"}],
        "transaction": "/api/users/private-id",
        "message": "private exception detail",
        "request": {
            "method": "POST",
            "url": "https://api.example.test/api/users?token=secret",
            "headers": {"Cookie": "session=secret"},
            "data": {"password": "secret"},
        },
        "exception": {"values": [{"type": "DatabaseError", "value": "private query details"}]},
    }

    assert sanitize_sentry_event(event, {}) == {
        "message": "Application error",
        "request": {"method": "POST"},
        "exception": {"values": [{"type": "DatabaseError", "value": "DatabaseError"}]},
    }


def test_sentry_source_tag_does_not_include_request_paths_or_identifiers():
    assert _safe_source("youtube_cache") == "youtube_cache"
    assert _safe_source("/api/admin/users/private-id?token=secret") == "http_request"
