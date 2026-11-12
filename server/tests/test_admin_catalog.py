import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.config import get_settings
from app import models
from app.services.admin_credentials import hash_password


@pytest.fixture
def admin_catalog_client(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        session = session_factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setenv("DEBUG", "true")
    monkeypatch.setenv("ADMIN_SESSION_SECRET", "catalog-test-session-secret")
    get_settings.cache_clear()
    with session_factory() as session:
        session.add(
            models.AdminUser(
                username="catalog-admin",
                password_hash=hash_password("catalog-test-password"),
            )
        )
        session.commit()
    with TestClient(app) as client:
        response = client.post(
            "/api/auth/login",
            json={"username": "catalog-admin", "password": "catalog-test-password"},
        )
        assert response.status_code == 200
        yield client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    get_settings.cache_clear()


def test_resource_crud_is_authenticated_and_validates_links(admin_catalog_client):
    client = admin_catalog_client
    payload = {
        "title": "  Faithful pack  ",
        "description": "  Texture pack  ",
        "resource_type": "texture_pack",
        "game_category": "minecraft",
        "game_version": "1.21.1",
        "download_url": "https://downloads.example.test/faithful.zip",
        "cover_image_url": "https://images.example.test/faithful.webp",
        "related_video_ids": ["dQw4w9WgXcQ"],
    }

    unauthorized = TestClient(app).post("/api/admin/resources", json=payload)
    assert unauthorized.status_code == 401

    created = client.post("/api/admin/resources", json=payload)
    assert created.status_code == 201
    resource = created.json()
    assert resource["title"] == "Faithful pack"
    assert resource["download_url"] == "https://downloads.example.test/faithful.zip"
    assert resource["related_video_ids"] == ["dQw4w9WgXcQ"]
    linked = client.get("/api/resources?video_id=dQw4w9WgXcQ&page=1&limit=10")
    assert [item["id"] for item in linked.json()["items"]] == [resource["id"]]

    updated = client.put(
        f"/api/admin/resources/{resource['id']}",
        json={**payload, "title": "Faithful updated", "cover_image_url": None, "related_video_ids": ["abcdefghijk"]},
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Faithful updated"
    assert updated.json()["cover_image_url"] is None
    assert updated.json()["related_video_ids"] == ["abcdefghijk"]
    assert client.get("/api/resources?video_id=dQw4w9WgXcQ&page=1&limit=10").json()["items"] == []
    assert len(client.get("/api/resources?video_id=abcdefghijk&page=1&limit=10").json()["items"]) == 1
    assert client.get("/api/resources?video_id=bad-video-id").status_code == 422
    invalid_video_id = client.post(
        "/api/admin/resources",
        json={**payload, "related_video_ids": ["not-a-youtube-id"]},
    )
    assert invalid_video_id.status_code == 422
    assert [item["id"] for item in client.get("/api/resources").json()] == [resource["id"]]

    invalid = client.post("/api/admin/resources", json={**payload, "download_url": "javascript:alert(1)"})
    assert invalid.status_code == 422
    oversized_url = f"https://downloads.example.test/{'x' * 512}"
    oversized = client.post(
        "/api/admin/resources",
        json={**payload, "download_url": oversized_url},
    )
    assert oversized.status_code == 422
    assert client.delete(f"/api/admin/resources/{resource['id']}").status_code == 204
    assert client.get("/api/resources").json() == []
    assert client.get("/api/resources/filters").json()["game_versions"] == []
    archived_resource = client.get("/api/admin/resources?archive=archived").json()["items"][0]
    assert archived_resource["archived_at"] is not None
    restored_resource = client.post(f"/api/admin/resources/{resource['id']}/restore")
    assert restored_resource.status_code == 200
    assert restored_resource.json()["archived_at"] is None
    assert len(client.get("/api/resources").json()) == 1
    assert client.post("/api/admin/resources/missing/restore").status_code == 404


def test_seed_crud_and_validation(admin_catalog_client):
    client = admin_catalog_client
    payload = {
        "title": "  Cherry grove  ",
        "seed_code": "-123456789",
        "coordinates": "X: 120, Z: -340",
        "minecraft_version": "1.21.1",
        "description": "Beautiful spawn",
        "screenshot_url": "https://images.example.test/spawn.webp",
        "related_video_ids": ["dQw4w9WgXcQ"],
    }

    created = client.post("/api/admin/seeds", json=payload)
    assert created.status_code == 201
    seed = created.json()
    assert seed["title"] == "Cherry grove"
    assert seed["related_video_ids"] == ["dQw4w9WgXcQ"]
    linked = client.get("/api/seeds?video_id=dQw4w9WgXcQ&page=1&limit=10")
    assert [item["id"] for item in linked.json()["items"]] == [seed["id"]]

    updated = client.put(f"/api/admin/seeds/{seed['id']}", json={**payload, "seed_code": "987654321"})
    assert updated.status_code == 200
    assert updated.json()["seed_code"] == "987654321"
    assert len(client.get("/api/seeds").json()) == 1

    invalid = client.post("/api/admin/seeds", json={**payload, "screenshot_url": "file:///private/image.png"})
    assert invalid.status_code == 422
    assert client.delete(f"/api/admin/seeds/{seed['id']}").status_code == 204
    assert client.get("/api/seeds").json() == []
    archived_seed = client.get("/api/admin/seeds?archive=archived").json()["items"][0]
    assert archived_seed["archived_at"] is not None
    assert client.post(f"/api/admin/seeds/{seed['id']}/restore").status_code == 200
    assert len(client.get("/api/seeds").json()) == 1


def test_event_crud_is_admin_only_and_rejects_unsafe_urls(admin_catalog_client):
    client = admin_catalog_client
    payload = {
        "title": "  Совместное выживание  ",
        "description": "  Вечерний игровой ивент  ",
        "game": "  Minecraft  ",
        "starts_at": "2027-02-03T18:30:00",
        "image_url": "https://images.example.test/event.webp",
        "max_participants": 12,
        "status": "registration_open",
        "registration_url": "https://0x00space.vercel.app/#application",
    }

    assert TestClient(app).post("/api/admin/events", json=payload).status_code == 401
    created = client.post("/api/admin/events", json=payload)
    assert created.status_code == 201
    event = created.json()
    assert event["title"] == "Совместное выживание"
    assert event["game"] == "Minecraft"

    updated = client.put(
        f"/api/admin/events/{event['id']}",
        json={**payload, "status": "completed", "image_url": None},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "completed"
    assert updated.json()["image_url"] is None
    assert [item["id"] for item in client.get("/api/events").json()] == [event["id"]]

    invalid = client.post(
        "/api/admin/events",
        json={**payload, "registration_url": "javascript:alert(1)"},
    )
    assert invalid.status_code == 422
    assert client.delete(f"/api/admin/events/{event['id']}").status_code == 204
    assert client.get("/api/events").json() == []
    assert client.get("/api/events/games").json() == []
    assert client.get(f"/api/events/{event['id']}").status_code == 404
    archived_event = client.get("/api/admin/events?archive=archived").json()["items"][0]
    assert archived_event["archived_at"] is not None
    assert client.post(f"/api/admin/events/{event['id']}/restore").status_code == 200
    assert len(client.get("/api/events").json()) == 1


def test_admin_catalog_search_archive_filters_and_pagination(admin_catalog_client):
    client = admin_catalog_client
    for index in range(3):
        response = client.post(
            "/api/admin/resources",
            json={
                "title": f"Mod pack {index}",
                "resource_type": "mod",
                "game_category": "minecraft",
                "game_version": "1.21",
                "download_url": f"https://downloads.example.test/mod-{index}.zip",
            },
        )
        assert response.status_code == 201

    page = client.get("/api/admin/resources?page=1&limit=2&archive=active")
    assert page.status_code == 200
    assert len(page.json()["items"]) == 2
    assert page.json()["total"] == 3
    assert page.json()["has_next"] is True

    match = client.get("/api/admin/resources?search=pack%202&archive=active")
    assert [item["title"] for item in match.json()["items"]] == ["Mod pack 2"]

    archived_id = page.json()["items"][0]["id"]
    assert client.delete(f"/api/admin/resources/{archived_id}").status_code == 204
    active = client.get("/api/admin/resources?archive=active")
    archived = client.get("/api/admin/resources?archive=archived")
    all_records = client.get("/api/admin/resources?archive=all")
    assert active.json()["total"] == 2
    assert archived.json()["total"] == 1
    assert all_records.json()["total"] == 3


def test_admin_applications_search_filter_and_status_updates(admin_catalog_client):
    client = admin_catalog_client
    payloads = [
        {"nickname": "AlexOne", "age": 18, "contact": "@alex-one", "game": "Minecraft", "video_idea": "Совместное выживание"},
        {"nickname": "MiraTwo", "age": 20, "contact": "@mira-two", "game": "Phasmophobia", "video_idea": "Записать хоррор"},
        {"nickname": "NeoThree", "age": 17, "contact": "@neo-three", "game": "Minecraft", "video_idea": "Построить базу"},
    ]
    created = [client.post("/api/applications", json=payload).json() for payload in payloads]

    assert TestClient(app).get("/api/applications/admin").status_code == 401
    page = client.get("/api/applications/admin?page=1&limit=2")
    assert page.status_code == 200
    assert page.json()["total"] == 3
    assert len(page.json()["items"]) == 2
    assert page.json()["has_next"] is True
    assert page.json()["items"][0]["telegram_notified"] is False

    matched = client.get("/api/applications/admin?search=mira&status=new")
    assert [item["nickname"] for item in matched.json()["items"]] == ["MiraTwo"]
    assert client.get("/api/applications/admin?status=unknown").status_code == 422

    updated = client.patch(
        f"/api/applications/admin/{created[0]['id']}/status",
        json={"status": "approved"},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "approved"
    assert client.get("/api/applications/admin?status=approved").json()["total"] == 1
    assert client.patch(
        f"/api/applications/admin/{created[0]['id']}/status",
        json={"status": "unexpected"},
    ).status_code == 422
    assert client.patch(
        "/api/applications/admin/missing/status",
        json={"status": "rejected"},
    ).status_code == 404


def test_event_applications_are_linked_counted_and_respect_capacity(admin_catalog_client):
    from app.routers import applications as applications_router
    from app.services.rate_limit import InMemoryRateLimiter

    applications_router._request_limiter = InMemoryRateLimiter(limit=5, window_seconds=3600)
    client = admin_catalog_client
    created_event = client.post("/api/admin/events", json={
        "title": "Командное выживание",
        "description": "Поиграем вместе",
        "game": "Minecraft",
        "starts_at": "2027-02-03T18:30:00",
        "max_participants": 1,
        "status": "registration_open",
    })
    assert created_event.status_code == 201
    event_id = created_event.json()["id"]
    application_payload = {
        "nickname": "EventPlayer",
        "age": 19,
        "contact": "@event-player",
        "game": "Неверная игра",
        "video_idea": "Сыграть в событии вместе.",
        "event_id": event_id,
    }

    submitted = client.post("/api/applications", json=application_payload)
    assert submitted.status_code == 201
    assert submitted.json()["event_id"] == event_id
    assert submitted.json()["game"] == "Minecraft"
    assert client.get("/api/events?page=1&limit=10").json()["items"][0]["application_count"] == 1
    assert client.get("/api/admin/events?page=1&limit=10").json()["items"][0]["application_count"] == 1
    linked_application = client.get("/api/applications/admin?search=EventPlayer").json()["items"][0]
    assert linked_application["event_title"] == "Командное выживание"

    full = client.post("/api/applications", json={**application_payload, "nickname": "SecondPlayer"})
    assert full.status_code == 409

    rejected = client.patch(
        f"/api/applications/admin/{submitted.json()['id']}/status",
        json={"status": "rejected"},
    )
    assert rejected.status_code == 200
    assert client.get("/api/events?page=1&limit=10").json()["items"][0]["application_count"] == 0
    reopened = client.post("/api/applications", json={**application_payload, "nickname": "SecondPlayer"})
    assert reopened.status_code == 201

    closed = client.put(f"/api/admin/events/{event_id}", json={
        "title": "Командное выживание",
        "description": "Поиграем вместе",
        "game": "Minecraft",
        "starts_at": "2027-02-03T18:30:00",
        "max_participants": 1,
        "status": "completed",
    })
    assert closed.status_code == 200
    unavailable = client.post("/api/applications", json={**application_payload, "nickname": "ThirdPlayer"})
    assert unavailable.status_code == 409


def test_admin_audit_is_protected_and_excludes_submitted_personal_data(admin_catalog_client):
    client = admin_catalog_client
    assert TestClient(app).get("/api/admin/audit").status_code == 401

    resource_payload = {
        "title": "Audit test resource",
        "description": "Catalog description",
        "resource_type": "mod",
        "game_category": "minecraft",
        "game_version": "1.21",
        "download_url": "https://downloads.example.test/audit.zip",
        "related_video_ids": [],
    }
    resource = client.post("/api/admin/resources", json=resource_payload).json()
    updated = client.put(
        f"/api/admin/resources/{resource['id']}",
        json={**resource_payload, "title": "Updated audit resource"},
    )
    assert updated.status_code == 200

    application = client.post(
        "/api/applications",
        json={
            "nickname": "PrivateNickname",
            "age": 20,
            "contact": "private-contact",
            "game": "Minecraft",
            "video_idea": "Private application text",
        },
    ).json()
    changed = client.patch(
        f"/api/applications/admin/{application['id']}/status",
        json={"status": "approved"},
    )
    assert changed.status_code == 200

    resource_audit = client.get(
        "/api/admin/audit?entity_type=resource&action=updated&page=1&limit=1"
    )
    assert resource_audit.status_code == 200
    assert resource_audit.json()["total"] == 1
    assert resource_audit.json()["items"][0]["details"] == {"fields": ["title"]}
    assert resource_audit.json()["items"][0]["entity_id"] == resource["id"]
    assert resource_audit.json()["items"][0]["actor"] == "catalog-admin"
    assert resource_audit.json()["items"][0]["actor_id"]

    application_audit = client.get("/api/admin/audit?entity_type=application")
    assert application_audit.status_code == 200
    assert application_audit.json()["items"][0]["details"] == {"from": "new", "to": "approved"}
    response_text = application_audit.text
    assert "PrivateNickname" not in response_text
    assert "private-contact" not in response_text
    assert "Private application text" not in response_text
