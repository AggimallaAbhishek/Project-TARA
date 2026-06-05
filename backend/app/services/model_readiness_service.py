import logging
import time
from datetime import datetime, timezone
from typing import Any

try:
    import ollama
except ImportError:
    raise ImportError("ollama package not installed. Run: pip install ollama")

from app.config import get_settings

logger = logging.getLogger(__name__)


class ModelReadinessService:
    def __init__(self):
        self._cached: dict[str, Any] | None = None
        self._cached_until = 0.0

    @staticmethod
    def _model_names(models_payload: Any) -> set[str]:
        models = []
        if isinstance(models_payload, dict):
            models = models_payload.get("models") or []
        else:
            models = getattr(models_payload, "models", []) or []

        names: set[str] = set()
        for model in models:
            if isinstance(model, dict):
                name = model.get("name") or model.get("model")
            else:
                name = getattr(model, "name", None) or getattr(model, "model", None)
            if name:
                names.add(str(name))
        return names

    @staticmethod
    def _status_for_model(model: str, available_models: set[str], provider_error: str | None) -> dict[str, Any]:
        if not model:
            return {"configured": False, "available": False, "model": None, "error": "Model is not configured."}
        if provider_error:
            return {"configured": True, "available": False, "model": model, "error": provider_error}
        if model in available_models:
            return {"configured": True, "available": True, "model": model, "error": None}
        return {
            "configured": True,
            "available": False,
            "model": model,
            "error": f"Model '{model}' is not installed in Ollama.",
        }

    def check(self, *, force_refresh: bool = False) -> dict[str, Any]:
        now = time.time()
        settings = get_settings()
        if self._cached and not force_refresh and now < self._cached_until:
            return self._cached

        provider_error: str | None = None
        available_models: set[str] = set()
        try:
            client = ollama.Client(host=settings.ollama_host)
            available_models = self._model_names(client.list())
        except Exception as exc:
            provider_error = "Ollama is unreachable. Start Ollama and verify OLLAMA_HOST."
            logger.warning("Model readiness check failed host=%s error=%s", settings.ollama_host, exc)

        text_status = self._status_for_model(settings.ollama_model, available_models, provider_error)
        vision_status = self._status_for_model(settings.ollama_vision_model, available_models, provider_error)
        overall = "ready" if text_status["available"] and (
            not vision_status["configured"] or vision_status["available"]
        ) else "degraded"

        payload = {
            "status": overall,
            "text": text_status,
            "vision": vision_status,
            "checked_at": datetime.now(timezone.utc),
        }
        self._cached = payload
        self._cached_until = now + settings.ollama_readiness_cache_ttl_seconds
        return payload

    def clear_cache(self) -> None:
        self._cached = None
        self._cached_until = 0.0


model_readiness_service = ModelReadinessService()
