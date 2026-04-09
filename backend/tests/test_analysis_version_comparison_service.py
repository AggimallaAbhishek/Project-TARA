import pathlib
import sys
import unittest
from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.database import Base
from app.models.analysis import Analysis, Threat
from app.models.user import User
from app.services.analysis_version_comparison_service import analysis_version_comparison_service


class AnalysisVersionComparisonServiceTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = self.SessionLocal()

        self.user = User(
            email="comparison-user@example.com",
            name="Comparison User",
            google_id="comparison-google-id",
        )
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)
        self.engine.dispose()

    def _create_analysis(
        self,
        *,
        title: str,
        created_at: datetime,
        threats: list[dict],
    ) -> Analysis:
        analysis = Analysis(
            user_id=self.user.id,
            title=title,
            system_description="System details with enough context.",
            created_at=created_at,
            total_risk_score=0.0,
            analysis_time=0.1,
        )
        self.db.add(analysis)
        self.db.flush()

        total_score = 0.0
        for threat in threats:
            risk_score = float(threat["risk_score"])
            total_score += risk_score
            self.db.add(
                Threat(
                    analysis_id=analysis.id,
                    name=threat["name"],
                    description=threat.get("description", "desc"),
                    stride_category=threat["stride_category"],
                    affected_component=threat["affected_component"],
                    risk_level=threat.get("risk_level", "Medium"),
                    likelihood=threat.get("likelihood", 3),
                    impact=threat.get("impact", 3),
                    risk_score=risk_score,
                    mitigation=threat.get("mitigation", "1. step."),
                )
            )

        analysis.total_risk_score = round(total_score, 2)
        self.db.commit()
        self.db.refresh(analysis)
        return analysis

    def test_baseline_comparison_when_no_previous_version(self):
        now = datetime.now(timezone.utc)
        analysis = self._create_analysis(
            title="Mobile Banking",
            created_at=now,
            threats=[
                {
                    "name": "Credential stuffing",
                    "stride_category": "Spoofing",
                    "affected_component": "Auth Service",
                    "risk_level": "High",
                    "risk_score": 12,
                }
            ],
        )

        report = analysis_version_comparison_service.get_version_comparison(
            self.db,
            analysis_id=analysis.id,
            user_id=self.user.id,
        )
        self.assertFalse(report["has_previous_version"])
        self.assertEqual(report["previous_total_issues"], 0)
        self.assertEqual(report["resolved_issues_count"], 0)
        self.assertEqual(report["unresolved_issues_count"], 0)
        self.assertEqual(report["new_issues_count"], 1)

    def test_resolved_unresolved_and_new_issue_counts(self):
        now = datetime.now(timezone.utc)
        self._create_analysis(
            title="Payments Platform",
            created_at=now - timedelta(minutes=5),
            threats=[
                {
                    "name": "SQL Injection",
                    "stride_category": "Tampering",
                    "affected_component": "Database",
                    "risk_level": "Critical",
                    "risk_score": 20,
                },
                {
                    "name": "Token Replay",
                    "stride_category": "Spoofing",
                    "affected_component": "API Gateway",
                    "risk_level": "High",
                    "risk_score": 12,
                },
            ],
        )
        current = self._create_analysis(
            title="Payments Platform",
            created_at=now,
            threats=[
                {
                    "name": "Token Replay",
                    "stride_category": "Spoofing",
                    "affected_component": "API Gateway",
                    "risk_level": "Medium",
                    "risk_score": 8,
                },
                {
                    "name": "Privilege Escalation",
                    "stride_category": "Elevation of Privilege",
                    "affected_component": "Admin API",
                    "risk_level": "High",
                    "risk_score": 12,
                },
            ],
        )

        report = analysis_version_comparison_service.get_version_comparison(
            self.db,
            analysis_id=current.id,
            user_id=self.user.id,
        )
        self.assertTrue(report["has_previous_version"])
        self.assertEqual(report["previous_total_issues"], 2)
        self.assertEqual(report["resolved_issues_count"], 1)
        self.assertEqual(report["unresolved_issues_count"], 1)
        self.assertEqual(report["new_issues_count"], 1)

        resolved_names = {item["name"] for item in report["resolved_issues"]}
        unresolved_names = {item["name"] for item in report["unresolved_issues"]}
        new_names = {item["name"] for item in report["new_issues"]}

        self.assertIn("SQL Injection", resolved_names)
        self.assertIn("Token Replay", unresolved_names)
        self.assertIn("Privilege Escalation", new_names)

    def test_title_matching_is_case_insensitive_and_trimmed(self):
        now = datetime.now(timezone.utc)
        self._create_analysis(
            title="  Customer Portal  ",
            created_at=now - timedelta(minutes=10),
            threats=[
                {
                    "name": "Session Hijack",
                    "stride_category": "Spoofing",
                    "affected_component": "Web App",
                    "risk_level": "High",
                    "risk_score": 12,
                }
            ],
        )
        current = self._create_analysis(
            title="customer portal",
            created_at=now,
            threats=[
                {
                    "name": "Session Hijack",
                    "stride_category": "Spoofing",
                    "affected_component": "Web App",
                    "risk_level": "Medium",
                    "risk_score": 8,
                }
            ],
        )

        report = analysis_version_comparison_service.get_version_comparison(
            self.db,
            analysis_id=current.id,
            user_id=self.user.id,
        )
        self.assertTrue(report["has_previous_version"])
        self.assertEqual(report["unresolved_issues_count"], 1)


if __name__ == "__main__":
    unittest.main()
