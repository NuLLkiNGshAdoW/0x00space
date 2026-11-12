from datetime import datetime

import pytest
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app import models
from app.database import engine

pytestmark = pytest.mark.skipif(engine.dialect.name != "postgresql", reason="PostgreSQL CI job only")


def test_postgres_migrated_schema_and_database_constraints():
    with engine.connect() as connection:
        inspector = inspect(connection)
        assert {
            "applications",
            "events",
            "resources",
            "seeds",
            "game_leaderboard",
            "resource_video_links",
            "seed_video_links",
        }.issubset(inspector.get_table_names())
        assert connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one()

    event = models.Event(
        title="PostgreSQL integration event",
        description="Temporary row for migration verification",
        game="Minecraft",
        starts_at=datetime(2027, 1, 1),
        status=models.EventStatus.PLANNED,
    )
    application = models.Application(
        nickname="postgres-test",
        age=18,
        contact="@postgres-test",
        game="Minecraft",
        video_idea="Temporary integration test",
    )
    resource = models.Resource(
        title="PostgreSQL integration resource",
        resource_type=models.ResourceType.MOD,
        game_category=models.GameCategory.MINECRAFT,
        download_url="https://example.test/postgres-test",
    )

    with Session(engine) as session:
        try:
            session.add(event)
            session.flush()
            application.event_id = event.id
            session.add_all([application, resource])
            session.flush()

            stored_resource = session.get(models.Resource, resource.id)
            assert stored_resource.resource_type is models.ResourceType.MOD
            assert stored_resource.game_category is models.GameCategory.MINECRAFT

            session.execute(text("DELETE FROM events WHERE id = :event_id"), {"event_id": event.id})
            session.expire(application, ["event_id"])
            assert application.event_id is None
        finally:
            session.rollback()
