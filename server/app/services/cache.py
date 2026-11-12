"""TTL caches backed by process memory locally and Redis when configured."""
import json
import threading
import time
from typing import Any

from pydantic import BaseModel
from redis import Redis
from starlette.concurrency import run_in_threadpool

from app.config import get_settings
from app.services.rate_limit import create_redis_client


class CacheDataError(Exception):
    """Raised when a cached value cannot be decoded."""


class TTLCache:
    def __init__(self):
        self._store: dict[str, tuple[float, Any]] = {}
        self._lock = threading.Lock()

    async def get(self, key: str) -> Any | None:
        with self._lock:
            item = self._store.get(key)
            if item is None:
                return None
            expires_at, value = item
            if time.monotonic() >= expires_at:
                del self._store[key]
                return None
            return value

    async def set(self, key: str, value: Any, ttl_seconds: int) -> None:
        if ttl_seconds < 1:
            raise ValueError("Cache TTL must be positive")
        with self._lock:
            self._store[key] = (time.monotonic() + ttl_seconds, value)


class RedisTTLCache:
    def __init__(self, redis_client: Redis, key_prefix: str = "0x00space:cache"):
        self.redis = redis_client
        self.key_prefix = key_prefix

    async def get(self, key: str) -> Any | None:
        value = await run_in_threadpool(self.redis.get, self._key(key))
        if value is None:
            return None
        try:
            return json.loads(value)
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise CacheDataError("Cached value is not valid JSON") from exc

    async def set(self, key: str, value: Any, ttl_seconds: int) -> None:
        if ttl_seconds < 1:
            raise ValueError("Cache TTL must be positive")
        serialized = json.dumps(value, default=_json_default, separators=(",", ":"), ensure_ascii=False)
        await run_in_threadpool(self.redis.set, self._key(key), serialized, ex=ttl_seconds)

    def _key(self, key: str) -> str:
        return f"{self.key_prefix}:{key}"


def _json_default(value: Any) -> Any:
    if isinstance(value, BaseModel):
        return value.model_dump(mode="json")
    raise TypeError(f"Value of type {type(value).__name__} is not JSON serializable")


settings = get_settings()
if settings.RATE_LIMIT_REDIS_URL:
    cache: TTLCache | RedisTTLCache = RedisTTLCache(create_redis_client(settings.RATE_LIMIT_REDIS_URL))
else:
    cache = TTLCache()
