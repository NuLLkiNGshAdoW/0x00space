from fastapi.testclient import TestClient

from app.main import app
import app.main as main_module
import app.routers.backgrounds as backgrounds_router


def test_healthcheck():
    response = TestClient(app).get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_health_reports_storage_capabilities_without_secrets(monkeypatch, tmp_path):
    monkeypatch.setattr(backgrounds_router, "UPLOAD_DIR", tmp_path)
    monkeypatch.setattr(main_module.settings, "YOUTUBE_API_KEY", "health-test-key")
    monkeypatch.setattr(main_module.settings, "YOUTUBE_CHANNEL_ID", "health-test-channel")

    payload = TestClient(app).get("/api/health").json()

    assert payload["storage"] == {"readable": True, "writable": True}
    assert payload["youtube_configured"] is True
    assert "health-test-key" not in str(payload)
    assert "health-test-channel" not in str(payload)
    assert not list(tmp_path.glob(".health-*"))
