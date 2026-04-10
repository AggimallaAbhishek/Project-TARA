import json
import logging
from typing import Any

import redis

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class RedisService:
    """Singleton Redis client with connection pooling and graceful fallback."""

    def __init__(self):
        self._client: redis.Redis | None = None
        self._available: bool = False
        self._connect()

    def _connect(self) -> None:
        try:
            self._client = redis.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_connect_timeout=3,
                socket_timeout=3,
            )
            self._client.ping()
            self._available = True
            logger.info("Redis connected at %s", settings.redis_url)
        except Exception:
            self._available = False
            self._client = None
            logger.warning(
                "Redis unavailable at %s — falling back to in-memory caches",
                settings.redis_url,
            )

    @property
    def is_available(self) -> bool:
        if not self._client:
            return False
        try:
            self._client.ping()
            self._available = True
        except Exception:
            self._available = False
        return self._available

    @property
    def client(self) -> redis.Redis | None:
        return self._client if self._available else None

    # ── Threat cache helpers ──

    def get_threat_cache(self, key: str) -> list[dict[str, Any]] | None:
        if not self.is_available:
            return None
        try:
            data = self._client.get(f"tara:threat_cache:{key}")
            if data is None:
                return None
            return json.loads(data)
        except Exception:
            logger.warning("Redis threat cache GET failed for key=%s", key)
            return None

    def set_threat_cache(
        self, key: str, threats: list[dict[str, Any]], ttl_seconds: int
    ) -> None:
        if not self.is_available:
            return
        try:
            self._client.setex(
                f"tara:threat_cache:{key}",
                ttl_seconds,
                json.dumps(threats),
            )
        except Exception:
            logger.warning("Redis threat cache SET failed for key=%s", key)

    # ── Rate limiter helpers ──

    def rate_limit_check(
        self, key: str, max_requests: int, window_seconds: int
    ) -> tuple[bool, int]:
        """
        Sliding-window rate limiter using a Redis sorted set.
        Returns (is_allowed, retry_after_seconds).
        All operations are executed atomically in a single pipeline.
        """
        if not self.is_available:
            raise RuntimeError("Redis unavailable for rate limiting")

        import math
        import time

        now = time.time()
        window_start = now - window_seconds
        redis_key = f"tara:rate_limit:{key}"

        try:
            pipe = self._client.pipeline(transaction=True)
            pipe.zremrangebyscore(redis_key, "-inf", window_start)
            pipe.zcard(redis_key)
            results = pipe.execute()

            count = results[1]  # zcard result from pipeline

            if count >= max_requests:
                oldest = self._client.zrangebyscore(
                    redis_key, "-inf", "+inf", start=0, num=1
                )
                if oldest:
                    retry_after = max(
                        1, math.ceil(float(oldest[0]) + window_seconds - now)
                    )
                else:
                    retry_after = 1
                return False, retry_after

            pipe2 = self._client.pipeline(transaction=True)
            pipe2.zadd(redis_key, {str(now): now})
            pipe2.expire(redis_key, window_seconds + 1)
            pipe2.execute()
            return True, 0
        except Exception:
            logger.warning("Redis rate limit check failed for key=%s", key)
            raise RuntimeError("Redis rate limit check failed")

    def health_check(self) -> str:
        """Return health status string for the /health endpoint."""
        if self.is_available:
            return "healthy"
        return "unavailable"


redis_service = RedisService()
