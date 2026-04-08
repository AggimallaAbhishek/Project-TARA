import os
import pathlib
import sys
import tempfile
import unittest
from datetime import datetime
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.database import Base, get_db
from app.main import app
from app.models.analysis import Analysis, Threat
from app.models.audit import AuditLog
from app.models.user import User
from app.services.auth_service import get_current_user
from app.services.llm_service import llm_service
from app.services.pdf_service import pdf_report_service
from app.services.rate_limit_service import analyze_rate_limiter


def risk_level_for_score(score: float) -> str:
    if score >= 16:
        return "Critical"
    if score >= 10:
        return "High"
    if score >= 5:
        return "Medium"
    return "Low"


class AnalysisFeaturePassTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        temp_db_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        temp_db_file.close()
        cls.temp_db_path = temp_db_file.name

        cls.engine = create_engine(
            f"sqlite:///{cls.temp_db_path}",
            connect_args={"check_same_thread": False},
        )
        cls.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        Base.metadata.create_all(bind=cls.engine)

        db = cls.SessionLocal()
        user = User(
            email="feature-pass-user@example.com",
            name="Feature Pass User",
            google_id="feature-pass-google-id",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        cls.user_id = user.id
        db.close()

        def override_get_db():
            db_session = cls.SessionLocal()
            try:
                yield db_session
            finally:
                db_session.close()

        def override_get_current_user():
            return User(
                id=cls.user_id,
                email="feature-pass-user@example.com",
                name="Feature Pass User",
                google_id="feature-pass-google-id",
            )

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user] = override_get_current_user

        async def fake_analyze_system(_system_description: str):
            return (
                [
                    {
                        "name": "Session spoofing",
                        "description": "Attacker can reuse weak tokens.",
                        "stride_category": "Spoofing",
                        "affected_component": "Auth Gateway",
                        "likelihood": 4,
                        "impact": 4,
                        "mitigation": "Rotate tokens and enforce short TTL.",
                    }
                ],
                0.15,
            )

        cls._original_analyze_system = llm_service.analyze_system
        llm_service.analyze_system = fake_analyze_system

        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        llm_service.analyze_system = cls._original_analyze_system
        analyze_rate_limiter.clear()
        app.dependency_overrides.clear()
        cls.client.close()
        cls.engine.dispose()
        os.unlink(cls.temp_db_path)

    def setUp(self):
        analyze_rate_limiter.clear()
        db = self.SessionLocal()
        db.query(AuditLog).delete()
        db.query(Threat).delete()
        db.query(Analysis).delete()
        db.commit()
        db.close()

    def _insert_analysis(
        self,
        *,
        title: str,
        total_risk_score: float,
        stride_category: str,
        created_at: datetime,
    ) -> int:
        db = self.SessionLocal()
        analysis = Analysis(
            user_id=self.user_id,
            title=title,
            system_description=f"{title} description",
            created_at=created_at,
            updated_at=created_at,
            total_risk_score=total_risk_score,
            analysis_time=0.4,
        )
        db.add(analysis)
        db.flush()
        threat = Threat(
            analysis_id=analysis.id,
            name=f"{title} threat",
            description="Threat description",
            stride_category=stride_category,
            affected_component="API",
            risk_level=risk_level_for_score(total_risk_score),
            likelihood=4,
            impact=4,
            risk_score=total_risk_score,
            mitigation="Apply controls",
        )
        db.add(threat)
        db.commit()
        analysis_id = analysis.id
        db.close()
        return analysis_id

    def test_pagination_envelope_shape_and_order(self):
        self._insert_analysis(
            title="Payment Service",
            total_risk_score=17.0,
            stride_category="Spoofing",
            created_at=datetime(2026, 1, 1, 10, 0, 0),
        )
        self._insert_analysis(
            title="Inventory Core",
            total_risk_score=8.0,
            stride_category="Tampering",
            created_at=datetime(2026, 1, 5, 10, 0, 0),
        )
        self._insert_analysis(
            title="Legacy Gateway",
            total_risk_score=3.0,
            stride_category="Denial of Service",
            created_at=datetime(2026, 1, 10, 10, 0, 0),
        )

        response = self.client.get("/api/analyses", params={"skip": 0, "limit": 2})
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["total"], 3)
        self.assertEqual(payload["skip"], 0)
        self.assertEqual(payload["limit"], 2)
        self.assertTrue(payload["has_more"])
        self.assertEqual(len(payload["items"]), 2)
        self.assertEqual(payload["items"][0]["title"], "Legacy Gateway")

        second_page = self.client.get("/api/analyses", params={"skip": 2, "limit": 2})
        self.assertEqual(second_page.status_code, 200)
        second_payload = second_page.json()
        self.assertFalse(second_payload["has_more"])
        self.assertEqual(len(second_payload["items"]), 1)

    def test_search_and_filter_queries(self):
        self._insert_analysis(
            title="Payment Service",
            total_risk_score=17.0,
            stride_category="Spoofing",
            created_at=datetime(2026, 1, 1, 10, 0, 0),
        )
        self._insert_analysis(
            title="Inventory Core",
            total_risk_score=8.0,
            stride_category="Tampering",
            created_at=datetime(2026, 1, 5, 10, 0, 0),
        )
        self._insert_analysis(
            title="Legacy Gateway",
            total_risk_score=3.0,
            stride_category="Denial of Service",
            created_at=datetime(2026, 1, 10, 10, 0, 0),
        )

        by_query = self.client.get("/api/analyses", params={"q": "payment"})
        self.assertEqual(by_query.status_code, 200)
        self.assertEqual(by_query.json()["total"], 1)
        self.assertEqual(by_query.json()["items"][0]["title"], "Payment Service")

        by_risk = self.client.get("/api/analyses", params={"risk_level": "Critical"})
        self.assertEqual(by_risk.status_code, 200)
        self.assertEqual(by_risk.json()["total"], 1)
        self.assertEqual(by_risk.json()["items"][0]["title"], "Payment Service")

        by_stride = self.client.get("/api/analyses", params={"stride_category": "Tampering"})
        self.assertEqual(by_stride.status_code, 200)
        self.assertEqual(by_stride.json()["total"], 1)
        self.assertEqual(by_stride.json()["items"][0]["title"], "Inventory Core")

        by_date = self.client.get(
            "/api/analyses",
            params={"date_from": "2026-01-05", "date_to": "2026-01-10"},
        )
        self.assertEqual(by_date.status_code, 200)
        date_titles = [item["title"] for item in by_date.json()["items"]]
        self.assertEqual(by_date.json()["total"], 2)
        self.assertCountEqual(date_titles, ["Inventory Core", "Legacy Gateway"])

    def test_pdf_export_success_not_found_and_unauthorized(self):
        analysis_id = self._insert_analysis(
            title="Payment Service",
            total_risk_score=17.0,
            stride_category="Spoofing",
            created_at=datetime(2026, 1, 1, 10, 0, 0),
        )

        original_pdf_builder = pdf_report_service.build_analysis_pdf
        pdf_report_service.build_analysis_pdf = lambda _analysis: b"%PDF-1.4\n%mock\n"
        try:
            response = self.client.get(f"/api/analyses/{analysis_id}/export.pdf")
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.headers["content-type"].startswith("application/pdf"))
            self.assertIn("attachment;", response.headers.get("content-disposition", ""))
            self.assertGreater(len(response.content), 10)
        finally:
            pdf_report_service.build_analysis_pdf = original_pdf_builder

        not_found = self.client.get("/api/analyses/99999/export.pdf")
        self.assertEqual(not_found.status_code, 404)

        original_auth_override = app.dependency_overrides.pop(get_current_user, None)
        try:
            unauthorized = self.client.get(f"/api/analyses/{analysis_id}/export.pdf")
            self.assertEqual(unauthorized.status_code, 401)
        finally:
            if original_auth_override is not None:
                app.dependency_overrides[get_current_user] = original_auth_override

    def test_audit_logging_for_create_and_delete(self):
        payload = {
            "title": "Audit Tracked Analysis",
            "system_description": "This architecture includes auth, API gateway, and data processing service.",
        }
        create_response = self.client.post("/api/analyze", json=payload)
        self.assertEqual(create_response.status_code, 201)
        created_analysis_id = create_response.json()["id"]

        logs_after_create = self.client.get("/api/audit/logs")
        self.assertEqual(logs_after_create.status_code, 200)
        create_actions = [entry["action"] for entry in logs_after_create.json()]
        self.assertIn("analysis_created", create_actions)

        delete_response = self.client.delete(f"/api/analyses/{created_analysis_id}")
        self.assertEqual(delete_response.status_code, 204)

        logs_after_delete = self.client.get("/api/audit/logs")
        self.assertEqual(logs_after_delete.status_code, 200)
        actions = [entry["action"] for entry in logs_after_delete.json()]
        self.assertIn("analysis_deleted", actions)

        delete_entry = next(entry for entry in logs_after_delete.json() if entry["action"] == "analysis_deleted")
        self.assertEqual(delete_entry["analysis_id"], created_analysis_id)
        self.assertEqual(delete_entry["event_metadata"]["title"], "Audit Tracked Analysis")

    def test_analyze_returns_actionable_502_on_provider_unreachable(self):
        payload = {
            "title": "Provider Unreachable",
            "system_description": "System with API gateway and identity provider.",
        }

        with patch.object(
            llm_service,
            "analyze_system",
            new=AsyncMock(
                side_effect=RuntimeError(
                    "Ollama is unreachable. Start Ollama and verify OLLAMA_HOST is reachable from the backend runtime."
                )
            ),
        ):
            response = self.client.post("/api/analyze", json=payload)

        self.assertEqual(response.status_code, 502)
        self.assertIn("Ollama is unreachable", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
