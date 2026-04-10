import json
import logging
import time
import uuid
from threading import Lock
from typing import Any, Callable

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class InMemoryExtractSessionStore:
    def __init__(self, ttl_seconds: int, now_fn: Callable[[], float] | None = None):
        self.ttl_seconds = ttl_seconds
        self.now_fn = now_fn or time.time
        self._entries: dict[str, tuple[float, dict[str, Any]]] = {}
        self._lock = Lock()

    def create(self, payload: dict[str, Any]) -> str:
        extract_id = uuid.uuid4().hex
        expires_at = self.now_fn() + self.ttl_seconds
        with self._lock:
            self._entries[extract_id] = (expires_at, payload)
        return extract_id

    def get(self, extract_id: str) -> dict[str, Any] | None:
        with self._lock:
            entry = self._entries.get(extract_id)
            if not entry:
                return None

            expires_at, payload = entry
            if expires_at <= self.now_fn():
                self._entries.pop(extract_id, None)
                return None
            return payload

    def put(self, extract_id: str, payload: dict[str, Any]) -> None:
        expires_at = self.now_fn() + self.ttl_seconds
        with self._lock:
            self._entries[extract_id] = (expires_at, payload)

    def delete(self, extract_id: str) -> None:
        with self._lock:
            self._entries.pop(extract_id, None)

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()


class ExtractSessionService:
    def __init__(
        self,
        ttl_seconds: int | None = None,
        now_fn: Callable[[], float] | None = None,
    ):
        self.ttl_seconds = ttl_seconds or settings.diagram_extract_ttl_seconds
        self._fallback = InMemoryExtractSessionStore(
            ttl_seconds=self.ttl_seconds,
            now_fn=now_fn,
        )

    @staticmethod
    def _redis_key(extract_id: str) -> str:
        return f"tara:diagram_extract:{extract_id}"

    def _set_redis(self, extract_id: str, payload: dict[str, Any]) -> None:
        try:
            from app.services.redis_service import redis_service

            if not redis_service.is_available:
                return
            redis_service.client.setex(
                self._redis_key(extract_id),
                self.ttl_seconds,
                json.dumps(payload),
            )
        except Exception:
            logger.debug("Failed to save extract session in Redis", exc_info=True)

    def _get_redis(self, extract_id: str) -> dict[str, Any] | None:
        try:
            from app.services.redis_service import redis_service

            if not redis_service.is_available:
                return None
            raw = redis_service.client.get(self._redis_key(extract_id))
            if not raw:
                return None
            return json.loads(raw)
        except Exception:
            logger.debug("Failed to fetch extract session from Redis", exc_info=True)
            return None

    def _delete_redis(self, extract_id: str) -> None:
        try:
            from app.services.redis_service import redis_service

            if not redis_service.is_available:
                return
            redis_service.client.delete(self._redis_key(extract_id))
        except Exception:
            logger.debug("Failed to delete extract session from Redis", exc_info=True)

    def create_session(
        self,
        *,
        user_id: int,
        extracted_system_description: str,
        source_metadata: dict[str, Any],
    ) -> str:
        payload = {
            "user_id": user_id,
            "extracted_system_description": extracted_system_description,
            "source_metadata": source_metadata,
        }
        extract_id = self._fallback.create(payload)
        self._set_redis(extract_id, payload)
        return extract_id

    def get_session(self, *, extract_id: str, user_id: int) -> dict[str, Any] | None:
        payload = self._get_redis(extract_id)
        if payload is None:
            payload = self._fallback.get(extract_id)
        else:
            # Keep fallback hot so reads still work during transient Redis outages.
            self._fallback.put(extract_id, payload)

        if payload is None:
            return None
        if int(payload.get("user_id", -1)) != int(user_id):
            return None
        return payload

    def delete_session(self, extract_id: str) -> None:
        self._delete_redis(extract_id)
        self._fallback.delete(extract_id)

    def clear(self) -> None:
        self._fallback.clear()


extract_session_service = ExtractSessionService()
