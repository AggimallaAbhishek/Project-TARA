import logging
import math
import time
from collections import deque
from threading import Lock
from typing import Callable

logger = logging.getLogger(__name__)


class InMemoryRateLimiter:
    """In-memory fallback rate limiter using sliding window."""

    def __init__(
        self,
        max_requests: int,
        window_seconds: int,
        now_fn: Callable[[], float] | None = None,
    ):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.now_fn = now_fn or time.time
        self._buckets: dict[str, deque[float]] = {}
        self._lock = Lock()

    def is_allowed(self, key: str) -> tuple[bool, int]:
        now = self.now_fn()
        window_start = now - self.window_seconds

        with self._lock:
            bucket = self._buckets.setdefault(key, deque())
            while bucket and bucket[0] <= window_start:
                bucket.popleft()

            if len(bucket) >= self.max_requests:
                retry_after = max(1, math.ceil((bucket[0] + self.window_seconds) - now))
                return False, retry_after

            bucket.append(now)
            return True, 0

    def clear(self) -> None:
        with self._lock:
            self._buckets.clear()


class HybridRateLimiter:
    """Rate limiter that tries Redis first, falls back to in-memory."""

    def __init__(
        self,
        max_requests: int,
        window_seconds: int,
        now_fn: Callable[[], float] | None = None,
    ):
        self.max_requests = max_requests
        self._window_seconds = window_seconds
        self._fallback = InMemoryRateLimiter(
            max_requests=max_requests,
            window_seconds=window_seconds,
            now_fn=now_fn,
        )

    @property
    def now_fn(self) -> Callable[[], float]:
        return self._fallback.now_fn

    @now_fn.setter
    def now_fn(self, value: Callable[[], float]) -> None:
        self._fallback.now_fn = value

    @property
    def window_seconds(self) -> int:
        return self._window_seconds

    @window_seconds.setter
    def window_seconds(self, value: int) -> None:
        self._window_seconds = value
        self._fallback.window_seconds = value

    def is_allowed(self, key: str) -> tuple[bool, int]:
        try:
            from app.services.redis_service import redis_service

            if redis_service.is_available:
                return redis_service.rate_limit_check(
                    key,
                    max_requests=self.max_requests,
                    window_seconds=self._window_seconds,
                )
        except Exception:
            logger.debug("Redis rate limit unavailable, using in-memory fallback")

        return self._fallback.is_allowed(key)

    def clear(self) -> None:
        self._fallback.clear()


analyze_rate_limiter = HybridRateLimiter(max_requests=5, window_seconds=60)
diagram_extract_rate_limiter = HybridRateLimiter(max_requests=10, window_seconds=60)
diagram_analyze_rate_limiter = HybridRateLimiter(max_requests=5, window_seconds=60)
