from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.schemas import ApplicationCreate, YoutubeVideoOut
from app.services.admin_auth import valid_session
import app.routers.youtube as youtube_router
import app.routers.backgrounds as backgrounds_router


def test_admin_cookie_login_and_logout(monkeypatch):
    monkeypatch.setenv("ADMIN_PASSWORD", "test-password")
    monkeypatch.setenv("ADMIN_SESSION_SECRET", "test-session-secret")
    get_settings.cache_clear()
    client = TestClient(app)

    assert client.post("/api/auth/login", json={"password": "wrong"}).status_code == 401
    login = client.post("/api/auth/login", json={"password": "test-password"})
    assert login.status_code == 200
    assert "HttpOnly" in login.headers["set-cookie"]
    assert client.get("/api/auth/check").json() == {"authenticated": True}
    assert client.post("/api/auth/logout").status_code == 200
    assert client.get("/api/auth/check").status_code == 401


def test_production_cookie_allows_cross_site_frontend(monkeypatch):
    monkeypatch.setenv("ADMIN_PASSWORD", "test-password")
    monkeypatch.setenv("ADMIN_SESSION_SECRET", "test-session-secret")
    monkeypatch.setenv("COOKIE_SECURE", "true")
    get_settings.cache_clear()
    client = TestClient(app)

    response = client.post("/api/auth/login", json={"password": "test-password"})

    assert response.status_code == 200
    assert "samesite=none" in response.headers["set-cookie"].lower()
    assert "Secure" in response.headers["set-cookie"]


def test_malformed_admin_cookie_is_rejected_without_server_error(monkeypatch):
    monkeypatch.setenv("ADMIN_PASSWORD", "test-password")
    get_settings.cache_clear()
    assert valid_session("not-a-valid-base64-session.abc") is False


def test_application_payload_normalizes_text_and_rejects_blank_values():
    payload = ApplicationCreate(
        nickname="  Alex  ", age=18, contact="  @alex ", game=" Minecraft ",
        video_idea="  Build a base together  ", mic_or_experience_link="  ",
    )
    assert payload.nickname == "Alex"
    assert payload.contact == "@alex"
    assert payload.game == "Minecraft"
    assert payload.mic_or_experience_link is None

    try:
        ApplicationCreate(nickname="   ", age=18, contact="@alex", game="Minecraft", video_idea="valid idea")
    except ValueError:
        pass
    else:
        raise AssertionError("blank nickname must be rejected")


def test_video_detail_validates_id_and_returns_related(monkeypatch):
    video = YoutubeVideoOut(
        video_id="abcdefghijk", title="Test", description="", thumbnail_url="https://example.com/a.jpg",
        published_at=datetime.now(timezone.utc), is_short=False, url="https://youtube.com/watch?v=abcdefghijk",
        duration_seconds=100, view_count=1,
    )
    monkeypatch.setattr(youtube_router, "fetch_video", lambda _: _immediate(video))
    monkeypatch.setattr(youtube_router, "fetch_latest_videos", lambda limit: _immediate([video]))
    client = TestClient(app)
    assert client.get("/api/youtube/not-valid").status_code == 422
    response = client.get("/api/youtube/abcdefghijk")
    assert response.status_code == 200
    assert response.json()["video"]["video_id"] == "abcdefghijk"
    assert response.json()["related"] == []


def test_uploaded_background_becomes_global_active(monkeypatch, tmp_path):
    monkeypatch.setenv("ADMIN_PASSWORD", "test-password")
    monkeypatch.setenv("ADMIN_SESSION_SECRET", "test-session-secret")
    get_settings.cache_clear()
    monkeypatch.setattr(backgrounds_router, "UPLOAD_DIR", tmp_path)
    monkeypatch.setattr(backgrounds_router, "META_FILE", tmp_path / "metadata.json")
    client = TestClient(app)

    assert client.post("/api/auth/login", json={"password": "test-password"}).status_code == 200
    response = client.post(
        "/api/backgrounds/upload",
        files={"file": ("background.png", b"png-data", "image/png")},
    )

    assert response.status_code == 201
    public = client.get("/api/backgrounds").json()
    assert public["active"]["id"] == response.json()["id"]


def test_background_delete_rejects_path_traversal(monkeypatch, tmp_path):
    monkeypatch.setenv("ADMIN_PASSWORD", "test-password")
    monkeypatch.setenv("ADMIN_SESSION_SECRET", "test-session-secret")
    get_settings.cache_clear()
    monkeypatch.setattr(backgrounds_router, "UPLOAD_DIR", tmp_path)
    monkeypatch.setattr(backgrounds_router, "META_FILE", tmp_path / "metadata.json")
    client = TestClient(app)
    assert client.post("/api/auth/login", json={"password": "test-password"}).status_code == 200

    backgrounds_router.META_FILE.write_text(
        '{"active": {"id": "bad"}, "items": [{"id": "bad", "filename": "../outside.txt", "url": "/media/backgrounds/outside.txt"}]}',
        encoding="utf-8",
    )
    response = client.delete("/api/backgrounds/bad")

    assert response.status_code == 400


async def _immediate(value):
    return value
