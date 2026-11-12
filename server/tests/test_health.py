from fastapi.testclient import TestClient
from sqlalchemy import Column, Integer, MetaData, Table, create_engine

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
        "missing_tables": [
            "admin_audit_logs", "admin_users", "applications", "events", "game_leaderboard",
            "resource_video_links", "resources", "seed_video_links", "seeds",
        ],
        "missing_columns": [],
    }
    engine.dispose()


def test_database_health_reports_ready_schema():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(bind=engine)

    payload = main_module._check_database_schema(engine)

    assert payload == {
        "connected": True,
        "schema_ready": True,
        "missing_tables": [],
        "missing_columns": [],
    }
    engine.dispose()


def test_database_health_reports_missing_archive_migration_columns():
    engine = create_engine("sqlite://")
    metadata = MetaData()
    for table in (
        "applications", "resources", "seeds", "events", "game_leaderboard",
        "resource_video_links", "seed_video_links",
    ):
        Table(table, metadata, Column("id", Integer, primary_key=True))
    Table(
        "admin_audit_logs",
        metadata,
        Column("id", Integer, primary_key=True),
        Column("actor", Integer),
        Column("action", Integer),
        Column("entity_type", Integer),
        Column("entity_id", Integer),
        Column("details", Integer),
        Column("created_at", Integer),
        Column("actor_id", Integer),
    )
    Table("admin_users", metadata, Column("id", Integer, primary_key=True))
    metadata.create_all(bind=engine)

    payload = main_module._check_database_schema(engine)

    assert payload["schema_ready"] is False
    assert payload["missing_tables"] == []
    assert payload["missing_columns"] == [
        "applications.event_id", "events.archived_at", "resources.archived_at", "seeds.archived_at"
    ]
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
