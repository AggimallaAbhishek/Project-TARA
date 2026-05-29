import copy
import time
from collections import OrderedDict
from threading import Lock
from typing import Any, Callable


class ThreatCache:
    """In-memory LRU threat cache used when Redis is unavailable."""

    def __init__(self, ttl_seconds: int, max_entries: int, now_fn: Callable[[], float] | None = None):
        self.ttl_seconds = ttl_seconds
        self.max_entries = max_entries
        self.now_fn = now_fn or time.time
        self._entries: OrderedDict[str, tuple[float, list[dict[str, Any]]]] = OrderedDict()
        self._lock = Lock()

    def get(self, key: str) -> list[dict[str, Any]] | None:
        now = self.now_fn()
        with self._lock:
            entry = self._entries.get(key)
            if not entry:
                return None

            expires_at, threats = entry
            if expires_at <= now:
                self._entries.pop(key, None)
                return None

            self._entries.move_to_end(key)
            return copy.deepcopy(threats)

    def set(self, key: str, threats: list[dict[str, Any]]) -> None:
        now = self.now_fn()
        expires_at = now + self.ttl_seconds
        with self._lock:
            self._entries[key] = (expires_at, copy.deepcopy(threats))
            self._entries.move_to_end(key)

            while len(self._entries) > self.max_entries:
                self._entries.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()


class HybridThreatCache:
    """Threat cache that tries Redis first, falling back to in-memory storage."""

    def __init__(self, ttl_seconds: int, max_entries: int, now_fn: Callable[[], float] | None = None):
        self.ttl_seconds = ttl_seconds
        self._fallback = ThreatCache(
            ttl_seconds=ttl_seconds,
            max_entries=max_entries,
            now_fn=now_fn,
        )

    def get(self, key: str) -> list[dict[str, Any]] | None:
        try:
            from app.services.redis_service import redis_service
            result = redis_service.get_threat_cache(key)
            if result is not None:
                return result
        except Exception:
            pass
        return self._fallback.get(key)

    def set(self, key: str, threats: list[dict[str, Any]]) -> None:
        try:
            from app.services.redis_service import redis_service
            redis_service.set_threat_cache(key, threats, self.ttl_seconds)
        except Exception:
            pass
        self._fallback.set(key, threats)

    def clear(self) -> None:
        try:
            from app.services.redis_service import redis_service
            if redis_service.client:
                for key in redis_service.client.scan_iter(match="tara:threat_cache:*", count=100):
                    redis_service.client.delete(key)
        except Exception:
            pass
        self._fallback.clear()
