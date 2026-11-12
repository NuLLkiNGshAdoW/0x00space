from datetime import datetime, timezone

from fastapi.testclient import TestClient
from redis.exceptions import ConnectionError as RedisConnectionError

from app import models
from app.config import get_settings
from app.main import app
from app.schemas import ApplicationCreate, YoutubeVideoOut
from app.services.admin_auth import valid_session
import app.routers.youtube as youtube_router
import app.routers.backgrounds as backgrounds_router
import app.routers.auth as auth_router


def test_admin_cookie_login_and_logout(admin_auth):
    client, username, password, _ = admin_auth

    assert client.post(
        "/api/auth/login", json={"username": username, "password": "wrong"}
    ).status_code == 401
    login = client.post(
        "/api/auth/login",
        json={"username": f" {username.upper()} ", "password": password},
    )
    assert login.status_code == 200
    assert login.json() == {"authenticated": True, "username": username}
    assert "HttpOnly" in login.headers["set-cookie"]
    assert client.get("/api/auth/check").json() == {"authenticated": True, "username": username}
    assert client.post("/api/auth/logout").status_code == 200
    assert client.get("/api/auth/check").status_code == 401


def test_admin_session_is_revoked_when_account_version_changes(admin_auth):
    client, username, password, session_factory = admin_auth
    assert client.post(
        "/api/auth/login", json={"username": username, "password": password}
    ).status_code == 200
    with session_factory() as db:
        user = db.query(models.AdminUser).filter_by(username=username).one()
        user.session_version += 1
        db.commit()
    assert client.get("/api/auth/check").status_code == 401


def test_disabled_admin_cannot_log_in_or_keep_existing_session(admin_auth):
    client, username, password, session_factory = admin_auth
    assert client.post(
        "/api/auth/login", json={"username": username, "password": password}
    ).status_code == 200
    with session_factory() as db:
        user = db.query(models.AdminUser).filter_by(username=username).one()
        user.is_active = False
        user.session_version += 1
        db.commit()
    assert client.get("/api/auth/check").status_code == 401
    assert client.post(
        "/api/auth/login", json={"username": username, "password": password}
    ).status_code == 401


def test_admin_login_fails_closed_when_redis_failure_limiter_is_unavailable(
    monkeypatch, admin_auth
):
    client, username, password, _ = admin_auth

    def unavailable(_):
        raise RedisConnectionError("offline")

    monkeypatch.setattr(auth_router, "login_allowed", unavailable)
    response = client.post(
        "/api/auth/login",
        json={"username": username, "password": password},
    )

    assert response.status_code == 503


def test_production_cookie_allows_cross_site_frontend(monkeypatch, admin_auth):
    client, username, password, _ = admin_auth
    monkeypatch.setenv("COOKIE_SECURE", "true")
    get_settings.cache_clear()
    response = client.post("/api/auth/login", json={"username": username, "password": password})

    assert response.status_code == 200
    assert "samesite=none" in response.headers["set-cookie"].lower()
    assert "Secure" in response.headers["set-cookie"]


def test_malformed_admin_cookie_is_rejected_without_server_error(admin_auth):
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


def test_uploaded_background_becomes_global_active(monkeypatch, tmp_path, admin_auth):
    client, username, password, _ = admin_auth
    get_settings.cache_clear()
    monkeypatch.setattr(backgrounds_router, "UPLOAD_DIR", tmp_path)
    monkeypatch.setattr(backgrounds_router, "META_FILE", tmp_path / "metadata.json")
    assert client.post(
        "/api/auth/login", json={"username": username, "password": password}
    ).status_code == 200
    response = client.post(
        "/api/backgrounds/upload",
        files={"file": ("background.png", b"\x89PNG\r\n\x1a\nvalid-data", "image/png")},
    )

    assert response.status_code == 201
    public = client.get("/api/backgrounds").json()
    assert public["active"]["id"] == response.json()["id"]


def test_background_delete_rejects_path_traversal(monkeypatch, tmp_path, admin_auth):
    client, username, password, _ = admin_auth
    get_settings.cache_clear()
    monkeypatch.setattr(backgrounds_router, "UPLOAD_DIR", tmp_path)
    monkeypatch.setattr(backgrounds_router, "META_FILE", tmp_path / "metadata.json")
    assert client.post(
        "/api/auth/login", json={"username": username, "password": password}
    ).status_code == 200

    backgrounds_router.META_FILE.write_text(
        '{"active": {"id": "bad"}, "items": [{"id": "bad", "filename": "../outside.txt", "url": "/media/backgrounds/outside.txt"}]}',
        encoding="utf-8",
    )
    response = client.delete("/api/backgrounds/bad")

    assert response.status_code == 400


async def _immediate(value):
    return value
