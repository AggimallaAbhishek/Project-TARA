import pathlib
import sys
import unittest


PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.services.risk_service import risk_service


class RiskServiceTest(unittest.TestCase):
    def test_calculate_risk_score(self):
        self.assertEqual(risk_service.calculate_risk_score(4, 5), 20.0)

    def test_risk_level_from_score(self):
        self.assertEqual(risk_service.get_risk_level_from_score(4), "Low")
        self.assertEqual(risk_service.get_risk_level_from_score(9), "Medium")
        self.assertEqual(risk_service.get_risk_level_from_score(15), "High")
        self.assertEqual(risk_service.get_risk_level_from_score(16), "Critical")

    def test_total_risk_score_average(self):
        threats = [{"risk_score": 10}, {"risk_score": 20}, {"risk_score": 5}]
        self.assertEqual(risk_service.calculate_total_risk_score(threats), 11.67)

    def test_risk_summary_counts(self):
        threats = [
            {"risk_level": "Critical", "risk_score": 25, "stride_category": "Spoofing"},
            {"risk_level": "High", "risk_score": 12, "stride_category": "Spoofing"},
            {"risk_level": "Medium", "risk_score": 8, "stride_category": "Tampering"},
            {"risk_level": "Low", "risk_score": 2, "stride_category": "Repudiation"},
        ]

        summary = risk_service.get_risk_summary(threats)

        self.assertEqual(summary["total_threats"], 4)
        self.assertEqual(summary["critical_count"], 1)
        self.assertEqual(summary["high_count"], 1)
        self.assertEqual(summary["medium_count"], 1)
        self.assertEqual(summary["low_count"], 1)
        self.assertEqual(summary["average_risk_score"], 11.75)
        self.assertEqual(summary["max_risk_score"], 25)
        self.assertEqual(summary["stride_distribution"]["Spoofing"], 2)


if __name__ == "__main__":
    unittest.main()
