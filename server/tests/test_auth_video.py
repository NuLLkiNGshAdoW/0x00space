from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.schemas import YoutubeVideoOut
import app.routers.youtube as youtube_router


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


async def _immediate(value):
    return value
