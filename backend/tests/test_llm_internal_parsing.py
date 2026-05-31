import pathlib
import sys
import unittest

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.services.llm_internal.parsing import normalize_mitigation_steps, parse_llm_response


class LLMInternalParsingTest(unittest.TestCase):
    def test_parse_llm_response_normalizes_stride_and_mitigation(self):
        payload = '[{"name":"SQLi","description":"desc","stride_category":"spoofing","affected_component":"DB","likelihood":4,"impact":4,"mitigation":"use parameterized queries; rotate credentials"}]'

        threats = parse_llm_response(payload, logger=__import__('logging').getLogger(__name__))

        self.assertEqual(len(threats), 1)
        threat = threats[0]
        self.assertEqual(threat["stride_category"], "Spoofing")
        self.assertEqual(threat["risk_level"], "Critical")
        self.assertIn("1. use parameterized queries.", threat["mitigation"].lower())

    def test_normalize_mitigation_steps_handles_serialized_lists(self):
        mitigation = "['Define trust boundaries', 'Use segmentation']"
        normalized = normalize_mitigation_steps(mitigation)

        self.assertIn("1. Define trust boundaries.", normalized)
        self.assertIn("2. Use segmentation.", normalized)
        self.assertNotIn("[", normalized)


if __name__ == "__main__":
    unittest.main()
