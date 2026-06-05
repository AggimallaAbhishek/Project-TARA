from unittest.mock import patch
from types import SimpleNamespace

from app.services.model_readiness_service import ModelReadinessService


class FakeClient:
    calls = 0

    def __init__(self, host: str):  # noqa: ARG002
        pass

    def list(self):
        FakeClient.calls += 1
        return {"models": [{"name": "gpt-oss:120b-cloud"}, {"model": "vision-test-model"}]}


def test_model_readiness_reports_available_models_and_uses_cache():
    service = ModelReadinessService()
    FakeClient.calls = 0
    settings = SimpleNamespace(
        ollama_host="http://localhost:11434",
        ollama_model="gpt-oss:120b-cloud",
        ollama_vision_model="vision-test-model",
        ollama_readiness_cache_ttl_seconds=30,
    )

    with patch("app.services.model_readiness_service.ollama.Client", FakeClient):
        with patch("app.services.model_readiness_service.get_settings", return_value=settings):
            first = service.check(force_refresh=True)
            second = service.check()

    assert first["text"]["available"] is True
    assert second["text"]["available"] is True
    assert FakeClient.calls == 1


def test_model_readiness_reports_unreachable_provider():
    service = ModelReadinessService()
    settings = SimpleNamespace(
        ollama_host="http://localhost:11434",
        ollama_model="gpt-oss:120b-cloud",
        ollama_vision_model="vision-test-model",
        ollama_readiness_cache_ttl_seconds=30,
    )

    with patch("app.services.model_readiness_service.ollama.Client", side_effect=ConnectionError("down")):
        with patch("app.services.model_readiness_service.get_settings", return_value=settings):
            payload = service.check(force_refresh=True)

    assert payload["status"] == "degraded"
    assert payload["text"]["available"] is False
    assert "unreachable" in payload["text"]["error"].lower()
