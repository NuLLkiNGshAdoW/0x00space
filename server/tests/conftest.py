import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models
from app.config import get_settings
from app.database import Base, get_db
from app.main import app, api_rate_limiter
from app.services.admin_auth import clear_failures
from app.services.admin_credentials import hash_password


@pytest.fixture(autouse=True)
def reset_api_rate_limiter():
    api_rate_limiter.clear()
    yield
    api_rate_limiter.clear()


@pytest.fixture
def admin_auth(monkeypatch):
    clear_failures("testclient")
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

    previous_overrides = app.dependency_overrides.copy()
    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setenv("DEBUG", "true")
    monkeypatch.setenv("ADMIN_SESSION_SECRET", "test-session-secret")
    get_settings.cache_clear()
    with session_factory() as session:
        session.add(
            models.AdminUser(
                username="test-admin",
                password_hash=hash_password("test-password-123"),
            )
        )
        session.commit()

    try:
        with TestClient(app) as client:
            yield client, "test-admin", "test-password-123", session_factory
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)
        engine.dispose()
        clear_failures("testclient")
        get_settings.cache_clear()
