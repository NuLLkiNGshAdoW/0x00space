import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app import models
from app.config import Settings, get_settings, validate_production_security
from app.main import app
from app.services.admin_auth import configured_secret
from app.services.telegram import _build_message_text
import app.routers.backgrounds as backgrounds_router


def test_telegram_escapes_all_application_text_fields():
    application = models.Application(
        nickname="<test>",
        age=18,
        contact="John & Jane",
        game='"A & B"',
        mic_or_experience_link="<script>",
        video_idea="<>&",
    )

    message = _build_message_text(application)

    assert "<b>" in message and "</b>" in message
    assert "&lt;test&gt;" in message
    assert "John &amp; Jane" in message
    assert "&quot;" not in message
    assert "&lt;script&gt;" in message
    assert "&lt;&gt;&amp;" in message
    assert "<script>" not in message


def test_background_settings_accept_valid_existing_configuration(monkeypatch, tmp_path):
    monkeypatch.setenv("ADMIN_PASSWORD", "test-password")
    monkeypatch.setenv("ADMIN_SESSION_SECRET", "test-session-secret")
    get_settings.cache_clear()
    monkeypatch.setattr(backgrounds_router, "UPLOAD_DIR", tmp_path)
    monkeypatch.setattr(backgrounds_router, "META_FILE", tmp_path / "metadata.json")
    client = TestClient(app)
    assert client.post("/api/auth/login", json={"password": "test-password"}).status_code == 200

    response = client.put(
        "/api/backgrounds/settings",
        json={"shade": 0.5, "blur": 4, "position": "center", "speed": 1, "rotation_minutes": 60},
    )
    assert response.status_code == 200
    assert response.json()["rotation_minutes"] == 60


@pytest.mark.parametrize(
    "payload",
    [
        {"shade": 999},
        {"position": None},
        {"unknown": 1},
        {"rotation_minutes": -1},
    ],
)
def test_background_settings_reject_malformed_payloads(monkeypatch, tmp_path, payload):
    monkeypatch.setenv("ADMIN_PASSWORD", "test-password")
    monkeypatch.setenv("ADMIN_SESSION_SECRET", "test-session-secret")
    get_settings.cache_clear()
    monkeypatch.setattr(backgrounds_router, "UPLOAD_DIR", tmp_path)
    monkeypatch.setattr(backgrounds_router, "META_FILE", tmp_path / "metadata.json")
    client = TestClient(app)
    assert client.post("/api/auth/login", json={"password": "test-password"}).status_code == 200
    response = client.put("/api/backgrounds/settings", json=payload)
    assert response.status_code == 422


def test_background_public_url_rejects_unsafe_schemes():
    for value in ("javascript:alert(1)", "data:text/plain,hello", "file:///tmp/bg"):
        with pytest.raises(ValidationError):
            Settings(BACKGROUND_PUBLIC_BASE_URL=value)


def test_background_upload_rejects_mismatched_file_signature(monkeypatch, tmp_path):
    monkeypatch.setenv("ADMIN_PASSWORD", "test-password")
    monkeypatch.setenv("ADMIN_SESSION_SECRET", "test-session-secret")
    get_settings.cache_clear()
    monkeypatch.setattr(backgrounds_router, "UPLOAD_DIR", tmp_path)
    monkeypatch.setattr(backgrounds_router, "META_FILE", tmp_path / "metadata.json")
    client = TestClient(app)
    assert client.post("/api/auth/login", json={"password": "test-password"}).status_code == 200
    response = client.post(
        "/api/backgrounds/upload",
        files={"file": ("fake.png", b"not-a-png", "image/png")},
    )
    assert response.status_code == 415


def test_missing_background_file_is_a_graceful_catalog_fallback(monkeypatch, tmp_path):
    monkeypatch.setenv("ADMIN_PASSWORD", "test-password")
    monkeypatch.setenv("ADMIN_SESSION_SECRET", "test-session-secret")
    get_settings.cache_clear()
    monkeypatch.setattr(backgrounds_router, "UPLOAD_DIR", tmp_path)
    monkeypatch.setattr(backgrounds_router, "META_FILE", tmp_path / "metadata.json")
    client = TestClient(app)
    assert client.post("/api/auth/login", json={"password": "test-password"}).status_code == 200

    response = client.post(
        "/api/backgrounds/upload",
        files={"file": ("valid.png", b"\x89PNG\r\n\x1a\nvalid", "image/png")},
    )
    assert response.status_code == 201
    item = response.json()
    (tmp_path / item["filename"]).unlink()

    public = client.get("/api/backgrounds")
    assert public.status_code == 200
    assert public.json()["active"] is None
    assert public.json()["items"] == []

    activate = client.post(f"/api/backgrounds/{item['id']}/activate")
    assert activate.status_code == 409
    delete = client.delete(f"/api/backgrounds/{item['id']}")
    assert delete.status_code == 200
    assert client.get("/api/backgrounds").json()["items"] == []


def test_production_requires_dedicated_session_secret(monkeypatch):
    settings = Settings(DEBUG=False, DATABASE_URL="postgresql://db/app", ADMIN_SESSION_SECRET="")
    with pytest.raises(RuntimeError, match="ADMIN_SESSION_SECRET"):
        validate_production_security(settings)

    monkeypatch.setenv("DEBUG", "false")
    monkeypatch.setenv("DATABASE_URL", "postgresql://db/app")
    monkeypatch.setenv("ADMIN_PASSWORD", "legacy-password")
    monkeypatch.delenv("ADMIN_SESSION_SECRET", raising=False)
    get_settings.cache_clear()
    assert configured_secret() == ""
    get_settings.cache_clear()


def test_production_auth_rejects_legacy_token_without_session_secret(monkeypatch):
    monkeypatch.setenv("DEBUG", "false")
    monkeypatch.setenv("DATABASE_URL", "postgresql://db/app")
    monkeypatch.setenv("ADMIN_TOKEN", "legacy-token")
    monkeypatch.delenv("ADMIN_SESSION_SECRET", raising=False)
    get_settings.cache_clear()
    response = TestClient(app).post("/api/auth/login", json={"password": "legacy-token"})
    assert response.status_code == 503
    get_settings.cache_clear()
