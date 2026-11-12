"""In-memory and Redis-backed sliding-window rate limiters."""
from __future__ import annotations

import hashlib
import uuid
from collections import OrderedDict, deque
from functools import lru_cache
from math import ceil
from threading import Lock
from time import monotonic

from redis import Redis

_SLIDING_WINDOW_SCRIPT = """
local time = redis.call('TIME')
local now = tonumber(time[1]) + tonumber(time[2]) / 1000000
local window_ms = tonumber(ARGV[1])
local window_seconds = window_ms / 1000
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - window_seconds)
local count = redis.call('ZCARD', KEYS[1])
if count >= tonumber(ARGV[2]) then
    local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
    local retry_ms = math.ceil((tonumber(oldest[2]) + window_seconds - now) * 1000)
    return math.max(1, retry_ms)
end
redis.call('ZADD', KEYS[1], now, ARGV[3])
redis.call('PEXPIRE', KEYS[1], window_ms)
return 0
"""

_LOGIN_ALLOWED_SCRIPT = """
local time = redis.call('TIME')
local now = tonumber(time[1]) + tonumber(time[2]) / 1000000
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - tonumber(ARGV[1]) / 1000)
return redis.call('ZCARD', KEYS[1]) < tonumber(ARGV[2]) and 1 or 0
"""

_LOGIN_FAILURE_SCRIPT = """
local time = redis.call('TIME')
local now = tonumber(time[1]) + tonumber(time[2]) / 1000000
redis.call('ZADD', KEYS[1], now, ARGV[2])
redis.call('PEXPIRE', KEYS[1], ARGV[1])
return 1
"""


@lru_cache(maxsize=4)
def create_redis_client(url: str) -> Redis:
    return Redis.from_url(
        url,
        socket_connect_timeout=1.5,
        socket_timeout=1.5,
        health_check_interval=30,
    )


def create_rate_limiter(
    redis_url: str,
    limit: int,
    window_seconds: int,
    key_prefix: str,
) -> InMemoryRateLimiter | RedisRateLimiter:
    if redis_url:
        return RedisRateLimiter(
            create_redis_client(redis_url),
            limit,
            window_seconds,
            key_prefix=key_prefix,
        )
    return InMemoryRateLimiter(limit, window_seconds)


def _client_key(prefix: str, client_key: str) -> str:
    digest = hashlib.sha256(client_key.encode("utf-8")).hexdigest()
    return f"{prefix}:{digest}"


class InMemoryRateLimiter:
    def __init__(self, limit: int, window_seconds: int, max_clients: int = 10_000):
        if limit < 1 or window_seconds < 1 or max_clients < 1:
            raise ValueError("Rate limit values must be positive")
        self.limit = limit
        self.window_seconds = window_seconds
        self.max_clients = max_clients
        self._requests: OrderedDict[str, deque[float]] = OrderedDict()
        self._lock = Lock()
        self._last_cleanup = monotonic()

    def retry_after(self, client_key: str) -> int | None:
        now = monotonic()
        with self._lock:
            if now - self._last_cleanup >= min(self.window_seconds, 60):
                self._remove_expired(now)
                self._last_cleanup = now

            recent = self._requests.get(client_key)
            if recent is not None:
                while recent and now - recent[0] >= self.window_seconds:
                    recent.popleft()
                if not recent:
                    del self._requests[client_key]
                    recent = None

            if recent and len(recent) >= self.limit:
                return max(1, ceil(self.window_seconds - (now - recent[0])))

            if recent is None:
                if len(self._requests) >= self.max_clients:
                    return self.window_seconds
                recent = deque()
                self._requests[client_key] = recent

            recent.append(now)
            self._requests.move_to_end(client_key)
            return None

    def clear(self) -> None:
        with self._lock:
            self._requests.clear()
            self._last_cleanup = monotonic()

    def ping(self) -> bool:
        return True

    def _remove_expired(self, now: float) -> None:
        for client_key, recent in list(self._requests.items()):
            while recent and now - recent[0] >= self.window_seconds:
                recent.popleft()
            if not recent:
                del self._requests[client_key]


class RedisRateLimiter:
    def __init__(
        self,
        redis_client: Redis,
        limit: int,
        window_seconds: int,
        key_prefix: str = "0x00space:rate-limit:api",
    ):
        if limit < 1 or window_seconds < 1:
            raise ValueError("Rate limit values must be positive")
        self.redis = redis_client
        self.limit = limit
        self.window_seconds = window_seconds
        self.window_ms = window_seconds * 1000
        self.key_prefix = key_prefix

    def retry_after(self, client_key: str) -> int | None:
        retry_ms = int(
            self.redis.eval(
                _SLIDING_WINDOW_SCRIPT,
                1,
                _client_key(self.key_prefix, client_key),
                self.window_ms,
                self.limit,
                uuid.uuid4().hex,
            )
        )
        return ceil(retry_ms / 1000) if retry_ms > 0 else None

    def ping(self) -> bool:
        return bool(self.redis.ping())


class InMemoryLoginFailureLimiter:
    def __init__(self, max_failures: int, window_seconds: int):
        if max_failures < 1 or window_seconds < 1:
            raise ValueError("Login limit values must be positive")
        self.max_failures = max_failures
        self.window_seconds = window_seconds
        self._failures: dict[str, list[float]] = {}
        self._lock = Lock()

    def login_allowed(self, client_key: str) -> bool:
        now = monotonic()
        with self._lock:
            recent = [stamp for stamp in self._failures.get(client_key, []) if now - stamp < self.window_seconds]
            self._failures[client_key] = recent
            return len(recent) < self.max_failures

    def record_failure(self, client_key: str) -> None:
        with self._lock:
            self._failures.setdefault(client_key, []).append(monotonic())

    def clear_failures(self, client_key: str) -> None:
        with self._lock:
            self._failures.pop(client_key, None)


class RedisLoginFailureLimiter:
    def __init__(
        self,
        redis_client: Redis,
        max_failures: int,
        window_seconds: int,
        key_prefix: str = "0x00space:rate-limit:admin-login",
    ):
        if max_failures < 1 or window_seconds < 1:
            raise ValueError("Login limit values must be positive")
        self.redis = redis_client
        self.max_failures = max_failures
        self.window_ms = window_seconds * 1000
        self.key_prefix = key_prefix

    def login_allowed(self, client_key: str) -> bool:
        allowed = self.redis.eval(
            _LOGIN_ALLOWED_SCRIPT,
            1,
            _client_key(self.key_prefix, client_key),
            self.window_ms,
            self.max_failures,
        )
        return bool(allowed)

    def record_failure(self, client_key: str) -> None:
        self.redis.eval(
            _LOGIN_FAILURE_SCRIPT,
            1,
            _client_key(self.key_prefix, client_key),
            self.window_ms,
            uuid.uuid4().hex,
        )

    def clear_failures(self, client_key: str) -> None:
        self.redis.delete(_client_key(self.key_prefix, client_key))
