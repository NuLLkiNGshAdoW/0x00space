"""
Простейший потокобезопасный in-memory кеш с TTL.

Для одного инстанса backend'а этого достаточно и не требует
поднимать Redis. Если проект вырастет и появится несколько
воркеров/реплик — заменить на Redis, интерфейс останется тем же.
"""
import time
import threading
from typing import Any, Optional


class TTLCache:
    def __init__(self):
        self._store: dict[str, tuple[float, Any]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            item = self._store.get(key)
            if item is None:
                return None
            expires_at, value = item
            if time.monotonic() > expires_at:
                # Кеш протух — удаляем и говорим, что данных нет
                del self._store[key]
                return None
            return value

    def set(self, key: str, value: Any, ttl_seconds: int) -> None:
        with self._lock:
            self._store[key] = (time.monotonic() + ttl_seconds, value)


# Единый инстанс кеша на всё приложение
cache = TTLCache()
