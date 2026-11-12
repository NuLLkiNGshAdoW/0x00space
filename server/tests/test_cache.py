import asyncio
import json
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from redis.exceptions import ConnectionError as RedisConnectionError

from app.main import app
from app.schemas import YoutubeVideoOut
from app.services.cache import CacheDataError, RedisTTLCache, TTLCache
import app.services.youtube_client as youtube_client


class FakeRedis:
    def __init__(self):
        self.values = {}

    def get(self, key):
        return self.values.get(key)

    def set(self, key, value, ex):
        self.values[key] = value
        return True


def _video():
    return YoutubeVideoOut(
        video_id="abcdefghijk",
        title="Cached video",
        description="A cache serialization test.",
        thumbnail_url="https://example.test/thumbnail.jpg",
        published_at=datetime(2026, 1, 2, tzinfo=timezone.utc),
        is_short=False,
        url="https://youtube.com/watch?v=abcdefghijk",
        duration_seconds=120,
        view_count=1,
    )


def test_in_memory_cache_expires_entries(monkeypatch):
    now = [100.0]
    monkeypatch.setattr("app.services.cache.time.monotonic", lambda: now[0])
    cache = TTLCache()

    async def verify():
        await cache.set("key", "value", 10)
        assert await cache.get("key") == "value"
        now[0] = 110.0
        assert await cache.get("key") is None

    asyncio.run(verify())


def test_redis_cache_serializes_youtube_models_as_json(monkeypatch):
    redis = FakeRedis()
    cache = RedisTTLCache(redis, key_prefix="test:cache")
    monkeypatch.setattr(youtube_client, "cache", cache)
    video = _video()

    async def verify():
        await cache.set("youtube:video:abcdefghijk", video, 60)
        stored = redis.values["test:cache:youtube:video:abcdefghijk"]
        assert json.loads(stored)["published_at"] == "2026-01-02T00:00:00Z"
        assert await youtube_client.fetch_video("abcdefghijk") == video
        await cache.set("youtube:latest_videos:12", [video], 60)
        assert await youtube_client.fetch_latest_videos(12) == [video]

    asyncio.run(verify())


def test_redis_cache_rejects_corrupted_json():
    redis = FakeRedis()
    redis.values["test:cache:broken"] = b"{broken"
    cache = RedisTTLCache(redis, key_prefix="test:cache")

    async def verify():
        try:
            await cache.get("broken")
        except CacheDataError:
            return
        raise AssertionError("corrupted cache entry must not be used")

    asyncio.run(verify())


def test_youtube_endpoint_returns_503_when_redis_cache_is_unavailable(monkeypatch):
    class UnavailableCache:
        async def get(self, key):
            raise RedisConnectionError("offline")

    monkeypatch.setattr(youtube_client, "cache", UnavailableCache())

    response = TestClient(app).get("/api/youtube/latest")

    assert response.status_code == 503
    assert response.json()["detail"] == "Кеш YouTube временно недоступен"
