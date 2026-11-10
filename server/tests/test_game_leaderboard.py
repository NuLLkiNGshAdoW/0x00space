import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
import app.routers.game as game_router


@pytest.fixture
def leaderboard_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    game_router._submit_log.clear()
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_leaderboard_keeps_best_score_per_anonymous_pilot(leaderboard_client):
    client = leaderboard_client
    player_id = "c353ad5f-09a1-4f5e-a4ed-273a1c234567"
    payload = {
        "player_id": player_id,
        "nickname": "Star Pilot",
        "score": 860,
        "difficulty": "adaptive",
        "ship": "interceptor",
    }

    first = client.post("/api/game/leaderboard", json=payload)
    assert first.status_code == 200
    assert first.json()["score"] == 860

    lower = client.post(
        "/api/game/leaderboard",
        json={**payload, "nickname": "Pilot Two", "score": 420, "ship": "courier"},
    )
    assert lower.status_code == 200
    assert lower.json()["score"] == 860
    assert lower.json()["nickname"] == "Pilot Two"
    assert lower.json()["ship"] == "interceptor"

    higher = client.post(
        "/api/game/leaderboard",
        json={**payload, "nickname": "Pilot Two", "score": 1200, "ship": "guardian"},
    )
    assert higher.status_code == 200
    assert higher.json()["score"] == 1200
    assert higher.json()["ship"] == "guardian"

    ranking = client.get("/api/game/leaderboard").json()
    assert len(ranking) == 1
    assert ranking[0]["player_id"] == player_id


@pytest.mark.parametrize(
    "changes",
    [
        {"score": -1},
        {"score": 10_000_001},
        {"difficulty": "impossible"},
        {"ship": "admin"},
        {"nickname": " "},
        {"unexpected": "field"},
    ],
)
def test_leaderboard_rejects_invalid_scores_and_profile_data(leaderboard_client, changes):
    payload = {
        "player_id": "c353ad5f-09a1-4f5e-a4ed-273a1c234567",
        "nickname": "Star Pilot",
        "score": 860,
        "difficulty": "standard",
        "ship": "courier",
    }
    assert leaderboard_client.post("/api/game/leaderboard", json={**payload, **changes}).status_code == 422


def test_leaderboard_limit_is_bounded(leaderboard_client):
    assert leaderboard_client.get("/api/game/leaderboard?limit=0").status_code == 422
    assert leaderboard_client.get("/api/game/leaderboard?limit=51").status_code == 422
