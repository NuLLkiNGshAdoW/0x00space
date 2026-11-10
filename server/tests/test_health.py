from fastapi.testclient import TestClient
from sqlalchemy import create_engine

from app.database import Base
from app.models import Application, Event, Resource, Seed
from app.main import app
import app.main as main_module
import app.routers.backgrounds as backgrounds_router


def test_healthcheck():
    response = TestClient(app).get("/api/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] in {"ok", "degraded"}
    assert "connected" in payload["database"]
    assert "schema_ready" in payload["database"]


def test_database_health_reports_missing_catalog_tables():
    engine = create_engine("sqlite://")

    payload = main_module._check_database_schema(engine)

    assert payload == {
        "connected": True,
        "schema_ready": False,
        "missing_tables": ["applications", "events", "game_leaderboard", "resources", "seeds"],
    }
    engine.dispose()


def test_database_health_reports_ready_schema():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(bind=engine)

    payload = main_module._check_database_schema(engine)

    assert payload == {"connected": True, "schema_ready": True, "missing_tables": []}
    engine.dispose()


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
