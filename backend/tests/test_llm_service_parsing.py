import pathlib
import sys
import json
import unittest
from unittest.mock import patch

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.services.llm_service import LLMService


def minimal_threat(name="Threat"):
    return {
        "name": name,
        "description": "desc",
        "stride_category": "spoofing",  # lower-case to test normalization
        "affected_component": "component",
        "likelihood": 4,
        "impact": 4,
        "mitigation": "fix",
    }


class LLMServiceParsingTest(unittest.IsolatedAsyncioTestCase):
    async def test_missing_risk_level_is_derived_from_score(self):
        service = LLMService(enable_cache=False, request_timeout_seconds=2)
        payload = json.dumps([minimal_threat()])
        with patch("app.services.llm_service.ollama.chat", return_value={"message": {"content": payload}}):
            threats, _elapsed = await service.analyze_system("desc")
        self.assertEqual(len(threats), 1)
        self.assertEqual(threats[0]["risk_level"], "Critical")  # 4x4=16 -> Critical per risk_service

    async def test_trims_and_defaults_stride_category(self):
        service = LLMService(enable_cache=False, request_timeout_seconds=2)
        invalid = minimal_threat(name="Invalid")
        invalid["stride_category"] = "   "+"unknown"+"   "
        payload = json.dumps([invalid])
        with patch("app.services.llm_service.ollama.chat", return_value={"message": {"content": payload}}):
            threats, _elapsed = await service.analyze_system("desc")
        self.assertEqual(len(threats), 1)
        self.assertEqual(threats[0]["stride_category"], "Information Disclosure")

    async def test_missing_optional_text_fields_are_defaulted(self):
        service = LLMService(enable_cache=False, request_timeout_seconds=2)
        minimal = {
            "name": "",
            "description": None,
            "stride_category": "Spoofing",
            "affected_component": None,
            "likelihood": "5",
            "impact": 2,
            "mitigation": "",
        }
        payload = json.dumps([minimal])
        with patch("app.services.llm_service.ollama.chat", return_value={"message": {"content": payload}}):
            threats, _elapsed = await service.analyze_system("desc")

        self.assertEqual(len(threats), 1)
        threat = threats[0]
        self.assertEqual(threat["name"], "Untitled threat")
        self.assertEqual(threat["description"], "No description provided.")
        self.assertEqual(threat["affected_component"], "Unspecified component")
        self.assertEqual(threat["mitigation"], "Mitigation not provided.")
        self.assertEqual(threat["risk_level"], "High")  # 5*2=10 -> High per risk_service

    async def test_retry_succeeds_after_empty_content_response(self):
        service = LLMService(
            enable_cache=False,
            request_timeout_seconds=2,
            num_predict=768,
            retry_on_invalid_response=True,
            retry_num_predict=4096,
        )
        invalid_response = {"message": {"content": "", "thinking": "analysis chain"}}
        valid_response = {"message": {"content": json.dumps([minimal_threat()])}}

        with patch(
            "app.services.llm_service.ollama.chat",
            side_effect=[invalid_response, valid_response],
        ) as mock_chat:
            threats, _elapsed = await service.analyze_system("desc")

        self.assertEqual(len(threats), 1)
        self.assertEqual(mock_chat.call_count, 2)
        first_call = mock_chat.call_args_list[0].kwargs
        second_call = mock_chat.call_args_list[1].kwargs
        self.assertNotIn("format", first_call)
        self.assertEqual(second_call.get("format"), "json")
        self.assertEqual(first_call["options"]["num_predict"], 768)
        self.assertEqual(second_call["options"]["num_predict"], 4096)

    async def test_retry_succeeds_after_truncated_json_response(self):
        service = LLMService(
            enable_cache=False,
            request_timeout_seconds=2,
            retry_on_invalid_response=True,
            retry_num_predict=4096,
        )
        invalid_json_response = {"message": {"content": '[{"name":"broken"}'}}
        valid_response = {"message": {"content": json.dumps([minimal_threat()])}}

        with patch(
            "app.services.llm_service.ollama.chat",
            side_effect=[invalid_json_response, valid_response],
        ) as mock_chat:
            threats, _elapsed = await service.analyze_system("desc")

        self.assertEqual(len(threats), 1)
        self.assertEqual(mock_chat.call_count, 2)

    async def test_both_attempts_invalid_raise_same_runtime_error(self):
        service = LLMService(
            enable_cache=False,
            request_timeout_seconds=2,
            retry_on_invalid_response=True,
            retry_num_predict=4096,
        )
        invalid_response = {"message": {"content": ""}}

        with patch(
            "app.services.llm_service.ollama.chat",
            side_effect=[invalid_response, invalid_response],
        ) as mock_chat:
            with self.assertRaises(RuntimeError) as context:
                await service.analyze_system("desc")

        self.assertEqual(mock_chat.call_count, 2)
        self.assertIn("Threat analysis response was invalid", str(context.exception))


if __name__ == "__main__":
    unittest.main()
