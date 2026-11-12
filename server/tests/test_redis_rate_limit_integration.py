import asyncio
import os
import time
import uuid
from datetime import datetime, timezone

import pytest
from redis import Redis

from app.schemas import YoutubeVideoOut
from app.services.cache import RedisTTLCache
from app.services.rate_limit import RedisLoginFailureLimiter, RedisRateLimiter

redis_url = os.getenv("TEST_REDIS_URL")
pytestmark = pytest.mark.skipif(not redis_url, reason="Redis integration job only")


def test_redis_api_limit_is_shared_and_expires():
    client = Redis.from_url(redis_url)
    prefix = f"test:api:{uuid.uuid4().hex}"
    first = RedisRateLimiter(client, limit=2, window_seconds=2, key_prefix=prefix)
    second = RedisRateLimiter(client, limit=2, window_seconds=2, key_prefix=prefix)

    try:
        assert first.retry_after("client-a") is None
        assert second.retry_after("client-a") is None
        assert first.retry_after("client-a") in {1, 2}
        time.sleep(2.1)
        assert second.retry_after("client-a") is None
    finally:
        client.close()


def test_redis_login_failures_are_shared_between_instances():
    client = Redis.from_url(redis_url)
    prefix = f"test:login:{uuid.uuid4().hex}"
    first = RedisLoginFailureLimiter(client, max_failures=2, window_seconds=60, key_prefix=prefix)
    second = RedisLoginFailureLimiter(client, max_failures=2, window_seconds=60, key_prefix=prefix)

    try:
        assert first.login_allowed("client-a")
        first.record_failure("client-a")
        assert second.login_allowed("client-a")
        second.record_failure("client-a")
        assert not first.login_allowed("client-a")
    finally:
        second.clear_failures("client-a")
        client.close()


def test_redis_youtube_cache_is_shared_between_instances():
    client = Redis.from_url(redis_url)
    prefix = f"test:cache:{uuid.uuid4().hex}"
    first = RedisTTLCache(client, key_prefix=prefix)
    second = RedisTTLCache(client, key_prefix=prefix)
    video = YoutubeVideoOut(
        video_id="abcdefghijk",
        title="Redis cached video",
        description="Shared cache integration test.",
        thumbnail_url="https://example.test/thumbnail.jpg",
        published_at=datetime(2026, 1, 2, tzinfo=timezone.utc),
        is_short=False,
        url="https://youtube.com/watch?v=abcdefghijk",
        duration_seconds=120,
        view_count=1,
    )

    async def verify():
        await first.set("youtube:video:abcdefghijk", video, 30)
        cached = await second.get("youtube:video:abcdefghijk")
        assert cached["title"] == video.title
        assert cached["video_id"] == video.video_id

    try:
        asyncio.run(verify())
    finally:
        client.delete(f"{prefix}:youtube:video:abcdefghijk")
        client.close()
