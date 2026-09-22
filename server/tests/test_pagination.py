from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models
from app.database import Base, get_db
from app.main import app


@pytest.fixture
def paginated_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = session_factory()
    now = datetime(2026, 1, 1, 12, 0)
    session.add_all(
        [
            models.Resource(
                title="Alpha resource",
                description="Minecraft pack",
                resource_type=models.ResourceType.MOD,
                game_category=models.GameCategory.MINECRAFT,
                download_url="https://example.test/a",
                created_at=now,
            ),
            models.Resource(
                title="Beta guide",
                description="Coop guide",
                resource_type=models.ResourceType.GUIDE,
                game_category=models.GameCategory.COOP,
                download_url="https://example.test/b",
                created_at=now + timedelta(seconds=1),
            ),
            models.Resource(
                title="Gamma shader",
                description="Another Minecraft resource",
                resource_type=models.ResourceType.SHADER,
                game_category=models.GameCategory.MINECRAFT,
                download_url="https://example.test/c",
                created_at=now + timedelta(seconds=2),
            ),
        ]
    )
    session.add_all(
        [
            models.Seed(
                title="Alpha seed",
                seed_code="111",
                minecraft_version="1.21",
                created_at=now,
            ),
            models.Seed(
                title="Beta seed",
                seed_code="222",
                minecraft_version="1.21",
                created_at=now + timedelta(seconds=1),
            ),
        ]
    )
    session.add_all(
        [
            models.Event(
                title="Later Minecraft event",
                description="Event",
                game="Minecraft",
                starts_at=now + timedelta(days=2),
                status=models.EventStatus.PLANNED,
                created_at=now,
            ),
            models.Event(
                title="Earlier Minecraft event",
                description="Event",
                game="Minecraft",
                starts_at=now + timedelta(days=1),
                status=models.EventStatus.REGISTRATION_OPEN,
                created_at=now,
            ),
            models.Event(
                title="Coop event",
                description="Event",
                game="Coop",
                starts_at=now + timedelta(days=3),
                status=models.EventStatus.PLANNED,
                created_at=now,
            ),
        ]
    )
    session.commit()
    session.close()

    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def test_resources_pages_filters_and_legacy_response(paginated_client):
    first = paginated_client.get("/api/resources?page=1&limit=2")
    assert first.status_code == 200
    assert len(first.json()["items"]) == 2
    assert first.json()["has_next"] is True
    second_page = paginated_client.get("/api/resources?page=2&limit=2")
    assert len(second_page.json()["items"]) == 1
    assert second_page.json()["has_next"] is False

    second = paginated_client.get(
        "/api/resources?page=1&limit=2&game_category=minecraft&sort=title&search=resource"
    )
    assert [item["title"] for item in second.json()["items"]] == ["Alpha resource", "Gamma shader"]

    legacy = paginated_client.get("/api/resources")
    assert legacy.status_code == 200
    assert isinstance(legacy.json(), list)


def test_events_pagination_preserves_filters_and_stable_sort(paginated_client):
    response = paginated_client.get(
        "/api/events?page=1&limit=1&game=Minecraft&status=registration_open"
    )
    assert response.status_code == 200
    assert [item["title"] for item in response.json()["items"]] == ["Earlier Minecraft event"]
    assert response.json()["has_next"] is False


def test_seeds_empty_page_and_limit_validation(paginated_client):
    sorted_page = paginated_client.get("/api/seeds?page=1&limit=1&sort=title")
    assert sorted_page.json()["items"][0]["title"] == "Alpha seed"

    empty = paginated_client.get("/api/seeds?page=99&limit=2")
    assert empty.status_code == 200
    assert empty.json()["items"] == []
    assert empty.json()["has_next"] is False

    for path in ("/api/events", "/api/resources", "/api/seeds"):
        assert paginated_client.get(f"{path}?page=1&limit=51").status_code == 422


def test_pagination_rejects_non_positive_page(paginated_client):
    assert paginated_client.get("/api/events?page=0&limit=2").status_code == 422
