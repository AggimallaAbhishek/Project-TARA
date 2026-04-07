import math
import time
from collections import deque
from threading import Lock
from typing import Callable


class InMemoryRateLimiter:
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


analyze_rate_limiter = InMemoryRateLimiter(max_requests=5, window_seconds=60)
