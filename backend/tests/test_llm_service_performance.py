import pathlib
import sys
import time
import unittest
import json
from unittest.mock import patch


PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.services.llm_service import LLMService


def make_threat(index: int) -> dict:
    return {
        "name": f"Threat {index}",
        "description": "Potential attack path",
        "stride_category": "Spoofing",
        "affected_component": "Auth Service",
        "risk_level": "High",
        "likelihood": 4,
        "impact": 4,
        "mitigation": "Apply stronger controls",
    }


class LLMServicePerformanceTest(unittest.IsolatedAsyncioTestCase):
    async def test_cache_hit_avoids_second_ollama_call(self):
        service = LLMService(
            model="test-model",
            enable_cache=True,
            cache_ttl_seconds=600,
            cache_max_entries=32,
            request_timeout_seconds=5,
            keep_alive="1m",
        )

        response_payload = {"message": {"content": json.dumps([make_threat(i) for i in range(1, 6)])}}

        with patch("app.services.llm_service.ollama.chat", return_value=response_payload) as mock_chat:
            first_threats, first_elapsed = await service.analyze_system(
                "API gateway, auth service, and user profile backend."
            )
            second_threats, second_elapsed = await service.analyze_system(
                "API gateway, auth service, and user profile backend."
            )

        self.assertEqual(mock_chat.call_count, 1)
        self.assertEqual(len(first_threats), 5)
        self.assertEqual(first_threats, second_threats)
        self.assertLessEqual(second_elapsed, first_elapsed)

    async def test_timeout_guard_returns_runtime_error(self):
        service = LLMService(
            model="test-model",
            enable_cache=False,
            request_timeout_seconds=0.01,
            keep_alive="1m",
        )

        def slow_chat(**_kwargs):
            time.sleep(0.05)
            return {"message": {"content": "[]"}}

        with patch("app.services.llm_service.ollama.chat", side_effect=slow_chat):
            with self.assertRaises(RuntimeError) as context:
                await service.analyze_system("Simple architecture description")

        self.assertIn("timed out", str(context.exception))

    async def test_response_is_bounded_to_five_threats(self):
        service = LLMService(
            model="test-model",
            enable_cache=False,
            request_timeout_seconds=5,
            keep_alive="1m",
        )

        raw_threats = [make_threat(i) for i in range(1, 8)]
        response_payload = {"message": {"content": json.dumps(raw_threats)}}

        with patch("app.services.llm_service.ollama.chat", return_value=response_payload):
            threats, _elapsed = await service.analyze_system("Another architecture")

        self.assertEqual(len(threats), 5)


if __name__ == "__main__":
    unittest.main()
