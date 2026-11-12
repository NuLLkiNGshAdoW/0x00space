import app.main as main_module
import app.services.rate_limit as rate_limit_module
from app.main import app
from app.services.rate_limit import (
    InMemoryLoginFailureLimiter,
    InMemoryRateLimiter,
    RedisLoginFailureLimiter,
    RedisRateLimiter,
)
from fastapi.testclient import TestClient
from redis.exceptions import ConnectionError as RedisConnectionError


class FakeRedis:
    def __init__(self, replies=None, error=None):
        self.replies = list(replies or [])
        self.error = error
        self.calls = []
        self.deleted = []

    def eval(self, *args):
        self.calls.append(args)
        if self.error:
            raise self.error
        return self.replies.pop(0)

    def delete(self, key):
        self.deleted.append(key)

    def ping(self):
        if self.error:
            raise self.error
        return True


def test_sliding_window_limiter_expires_requests(monkeypatch):
    now = [100.0]
    monkeypatch.setattr(rate_limit_module, "monotonic", lambda: now[0])
    limiter = InMemoryRateLimiter(limit=2, window_seconds=10)

    assert limiter.retry_after("client-a") is None
    assert limiter.retry_after("client-a") is None
    assert limiter.retry_after("client-a") == 10

    now[0] = 110.0
    assert limiter.retry_after("client-a") is None


def test_api_rate_limit_returns_429_and_skips_health_and_preflight(monkeypatch):
    monkeypatch.setattr(main_module, "api_rate_limiter", InMemoryRateLimiter(limit=1, window_seconds=60))
    client = TestClient(app)

    assert client.get("/api/not-a-route").status_code == 404
    limited = client.get("/api/not-a-route")
    assert limited.status_code == 429
    assert limited.headers["Retry-After"] == "60"
    assert client.get("/api/health").status_code == 200
    assert client.options("/api/not-a-route").status_code == 404


def test_redis_rate_limiter_uses_hashed_keys_and_converts_retry_window():
    redis = FakeRedis(replies=[0, 2500, 1200])
    limiter = RedisRateLimiter(redis, limit=2, window_seconds=10)

    assert limiter.retry_after("203.0.113.4") is None
    assert limiter.retry_after("203.0.113.4") == 3
    other_instance = RedisRateLimiter(redis, limit=2, window_seconds=10)
    assert other_instance.retry_after("203.0.113.4") == 2
    assert redis.calls[0][2] == redis.calls[1][2] == redis.calls[2][2]
    assert "203.0.113.4" not in redis.calls[0][2]
    assert limiter.ping()


def test_redis_login_failure_limiter_shares_and_clears_failure_keys():
    redis = FakeRedis(replies=[1, 1])
    limiter = RedisLoginFailureLimiter(redis, max_failures=5, window_seconds=900)

    assert limiter.login_allowed("203.0.113.4")
    limiter.record_failure("203.0.113.4")
    limiter.clear_failures("203.0.113.4")

    assert redis.calls[0][2] == redis.calls[1][2] == redis.deleted[0]
    assert "203.0.113.4" not in redis.deleted[0]


def test_redis_failure_returns_503_instead_of_falling_back(monkeypatch):
    unavailable = FakeRedis(error=RedisConnectionError("offline"))
    monkeypatch.setattr(
        main_module,
        "api_rate_limiter",
        RedisRateLimiter(unavailable, limit=2, window_seconds=60),
    )

    response = TestClient(app).get("/api/not-a-route")

    assert response.status_code == 503
    assert "Retry-After" not in response.headers


def test_health_reports_redis_unavailable_as_degraded(monkeypatch):
    unavailable = FakeRedis(error=RedisConnectionError("offline"))
    monkeypatch.setattr(
        main_module,
        "api_rate_limiter",
        RedisRateLimiter(unavailable, limit=2, window_seconds=60),
    )

    response = TestClient(app).get("/api/health")
    payload = response.json()

    assert response.status_code == 200
    assert payload["status"] == "degraded"
    assert payload["rate_limiter"] == {"storage": "redis", "available": False}


def test_in_memory_login_failure_limiter_clears_on_success():
    limiter = InMemoryLoginFailureLimiter(max_failures=1, window_seconds=60)

    assert limiter.login_allowed("client-a")
    limiter.record_failure("client-a")
    assert not limiter.login_allowed("client-a")
    limiter.clear_failures("client-a")
    assert limiter.login_allowed("client-a")
