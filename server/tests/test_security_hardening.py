import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app import models
from app.config import Settings, get_settings, validate_production_security
from app.main import app
from app.services.admin_auth import configured_secret
from app.services.telegram import _build_message_text
import app.routers.backgrounds as backgrounds_router
import app.services.background_storage as background_storage


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


def test_background_settings_accept_valid_existing_configuration(monkeypatch, tmp_path, admin_auth):
    client, username, password, _ = admin_auth
    get_settings.cache_clear()
    monkeypatch.setattr(backgrounds_router, "UPLOAD_DIR", tmp_path)
    monkeypatch.setattr(backgrounds_router, "META_FILE", tmp_path / "metadata.json")
    assert client.post(
        "/api/auth/login", json={"username": username, "password": password}
    ).status_code == 200

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
def test_background_settings_reject_malformed_payloads(monkeypatch, tmp_path, payload, admin_auth):
    client, username, password, _ = admin_auth
    get_settings.cache_clear()
    monkeypatch.setattr(backgrounds_router, "UPLOAD_DIR", tmp_path)
    monkeypatch.setattr(backgrounds_router, "META_FILE", tmp_path / "metadata.json")
    assert client.post(
        "/api/auth/login", json={"username": username, "password": password}
    ).status_code == 200
    response = client.put("/api/backgrounds/settings", json=payload)
    assert response.status_code == 422


def test_background_public_url_rejects_unsafe_schemes():
    for value in ("javascript:alert(1)", "data:text/plain,hello", "file:///tmp/bg"):
        with pytest.raises(ValidationError):
            Settings(BACKGROUND_PUBLIC_BASE_URL=value)


def test_s3_background_storage_requires_complete_configuration():
    with pytest.raises(ValidationError, match="BACKGROUND_S3_BUCKET"):
        Settings(BACKGROUND_STORAGE_BACKEND="s3")

    with pytest.raises(ValidationError, match="HTTPS URL"):
        Settings(BACKGROUND_S3_ENDPOINT_URL="http://example.test")


def test_s3_background_upload_and_catalog_use_object_storage(monkeypatch, tmp_path, admin_auth):
    class FakeBody:
        def __init__(self, value):
            self.value = value

        def read(self):
            return self.value

    class FakeS3Client:
        def __init__(self):
            self.objects = {}

        def upload_fileobj(self, file_obj, bucket, key, ExtraArgs):
            self.objects[key] = file_obj.read()

        def put_object(self, Bucket, Key, Body, ContentType=None):
            self.objects[Key] = Body.read() if hasattr(Body, "read") else Body

        def get_object(self, Bucket, Key):
            if Key not in self.objects:
                from botocore.exceptions import ClientError

                raise ClientError({"Error": {"Code": "NoSuchKey"}}, "GetObject")
            return {"Body": FakeBody(self.objects[Key])}

        def delete_object(self, Bucket, Key):
            self.objects.pop(Key, None)

    fake_client = FakeS3Client()
    monkeypatch.setenv("BACKGROUND_STORAGE_BACKEND", "s3")
    monkeypatch.setenv("BACKGROUND_S3_ENDPOINT_URL", "https://account.r2.cloudflarestorage.com")
    monkeypatch.setenv("BACKGROUND_S3_BUCKET", "backgrounds")
    monkeypatch.setenv("BACKGROUND_S3_ACCESS_KEY_ID", "test-access-key")
    monkeypatch.setenv("BACKGROUND_S3_SECRET_ACCESS_KEY", "test-secret-key")
    monkeypatch.setenv("BACKGROUND_PUBLIC_BASE_URL", "https://media.example.test")
    client, username, password, _ = admin_auth
    get_settings.cache_clear()
    monkeypatch.setattr(background_storage, "get_s3_client", lambda: fake_client)
    monkeypatch.setattr(backgrounds_router, "UPLOAD_DIR", tmp_path)
    monkeypatch.setattr(backgrounds_router, "META_FILE", tmp_path / "metadata.json")
    try:
        assert client.post(
            "/api/auth/login", json={"username": username, "password": password}
        ).status_code == 200
        response = client.post(
            "/api/backgrounds/upload",
            files={"file": ("background.png", b"\x89PNG\r\n\x1a\nvalid-data", "image/png")},
        )

        assert response.status_code == 201
        item = response.json()
        assert item["url"].startswith("https://media.example.test/")
        assert item["filename"] in fake_client.objects
        assert background_storage.CATALOG_KEY in fake_client.objects
        assert client.get("/api/backgrounds").json()["active"]["id"] == item["id"]

        deleted = client.delete(f"/api/backgrounds/{item['id']}")

        assert deleted.status_code == 200
        assert item["filename"] not in fake_client.objects
        assert client.get("/api/backgrounds").json()["items"] == []
    finally:
        get_settings.cache_clear()


def test_background_upload_rejects_mismatched_file_signature(monkeypatch, tmp_path, admin_auth):
    client, username, password, _ = admin_auth
    get_settings.cache_clear()
    monkeypatch.setattr(backgrounds_router, "UPLOAD_DIR", tmp_path)
    monkeypatch.setattr(backgrounds_router, "META_FILE", tmp_path / "metadata.json")
    assert client.post(
        "/api/auth/login", json={"username": username, "password": password}
    ).status_code == 200
    response = client.post(
        "/api/backgrounds/upload",
        files={"file": ("fake.png", b"not-a-png", "image/png")},
    )
    assert response.status_code == 415


def test_missing_background_file_is_a_graceful_catalog_fallback(monkeypatch, tmp_path, admin_auth):
    client, username, password, _ = admin_auth
    get_settings.cache_clear()
    monkeypatch.setattr(backgrounds_router, "UPLOAD_DIR", tmp_path)
    monkeypatch.setattr(backgrounds_router, "META_FILE", tmp_path / "metadata.json")
    assert client.post(
        "/api/auth/login", json={"username": username, "password": password}
    ).status_code == 200

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
    monkeypatch.delenv("ADMIN_SESSION_SECRET", raising=False)
    get_settings.cache_clear()
    assert configured_secret() == ""
    get_settings.cache_clear()


def test_production_requires_redis_rate_limit_storage():
    settings = Settings(
        DEBUG=False,
        DATABASE_URL="postgresql://db/app",
        ADMIN_SESSION_SECRET="test-session-secret",
    )
    with pytest.raises(RuntimeError, match="RATE_LIMIT_REDIS_URL"):
        validate_production_security(settings)

    with pytest.raises(ValidationError, match="redis://"):
        Settings(RATE_LIMIT_REDIS_URL="https://redis.example.test")


def test_auth_reports_missing_configuration_instead_of_rate_limit(monkeypatch):
    monkeypatch.setenv("DEBUG", "true")
    monkeypatch.delenv("DATABASE_URL", raising=False)
    get_settings.cache_clear()
    response = TestClient(app).post(
        "/api/auth/login", json={"username": "test-admin", "password": "anything"}
    )
    assert response.status_code == 503
    assert "не настроена" in response.json()["detail"]
    get_settings.cache_clear()


def test_legacy_admin_token_cannot_authenticate(monkeypatch, admin_auth):
    client, _, _, _ = admin_auth
    monkeypatch.setenv("ADMIN_TOKEN", "legacy-token")
    get_settings.cache_clear()
    response = client.get("/api/admin/resources", headers={"X-Admin-Token": "legacy-token"})
    assert response.status_code == 401
    get_settings.cache_clear()
