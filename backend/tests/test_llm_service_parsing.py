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


if __name__ == "__main__":
    unittest.main()
