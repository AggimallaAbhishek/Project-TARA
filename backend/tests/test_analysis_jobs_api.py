import os
import pathlib
import sys
import tempfile
import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.database import Base, get_db
from app.main import app
from app.models.user import User
import app.services.analysis_job_service as analysis_job_service_module
from app.services.auth_service import get_current_user
from app.services.llm_service import llm_service
from app.services.rate_limit_service import analyze_rate_limiter


class AnalysisJobsApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        temp_db_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        temp_db_file.close()
        cls.temp_db_path = temp_db_file.name
        cls.engine = create_engine(f"sqlite:///{cls.temp_db_path}", connect_args={"check_same_thread": False})
        cls.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        Base.metadata.create_all(bind=cls.engine)

        db = cls.SessionLocal()
        user = User(email="jobs@example.com", name="Jobs User", google_id="jobs-google")
        other_user = User(email="other-jobs@example.com", name="Other User", google_id="other-jobs-google")
        db.add_all([user, other_user])
        db.commit()
        db.refresh(user)
        db.refresh(other_user)
        cls.user_id = user.id
        cls.other_user_id = other_user.id
        db.close()

        def override_get_db():
            db_session = cls.SessionLocal()
            try:
                yield db_session
            finally:
                db_session.close()

        def override_get_current_user():
            return User(id=cls.user_id, email="jobs@example.com", name="Jobs User", google_id="jobs-google")

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user] = override_get_current_user

        async def fake_analyze_system(system_description: str, source_context=None):  # noqa: ARG001
            return (
                [
                    {
                        "name": "Token replay",
                        "description": "Bearer token can be replayed.",
                        "stride_category": "Spoofing",
                        "affected_component": "API Gateway",
                        "likelihood": 3,
                        "impact": 4,
                        "mitigation": "Bind tokens to sessions; rotate tokens.",
                        "evidence": ["API Gateway uses bearer tokens"],
                        "confidence": 0.8,
                    }
                ],
                0.01,
            )

        cls._original_analyze_system = llm_service.analyze_system
        cls._original_job_session_local = analysis_job_service_module.SessionLocal
        llm_service.analyze_system = fake_analyze_system
        analysis_job_service_module.SessionLocal = cls.SessionLocal
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        llm_service.analyze_system = cls._original_analyze_system
        analysis_job_service_module.SessionLocal = cls._original_job_session_local
        analyze_rate_limiter.clear()
        app.dependency_overrides.clear()
        cls.client.close()
        cls.engine.dispose()
        os.unlink(cls.temp_db_path)

    def setUp(self):
        analyze_rate_limiter.clear()

    def test_text_analysis_job_completes_and_can_be_polled(self):
        response = self.client.post(
            "/api/analyze/jobs",
            json={
                "title": "Async Text",
                "system_description": "API Gateway sends bearer tokens to Auth Service and Database.",
            },
        )

        self.assertEqual(response.status_code, 202)
        payload = response.json()
        self.assertEqual(payload["status"], "queued")

        polled = self.client.get(f"/api/analysis-jobs/{payload['job_id']}")
        self.assertEqual(polled.status_code, 200)
        job = polled.json()
        self.assertEqual(job["status"], "succeeded")
        self.assertEqual(job["stage"], "completed")
        self.assertIsInstance(job["analysis_id"], int)

    def test_job_polling_is_user_scoped(self):
        response = self.client.post(
            "/api/analyze/jobs",
            json={
                "title": "Scoped Job",
                "system_description": "Gateway, auth service, and database.",
            },
        )
        job_id = response.json()["job_id"]

        def override_other_user():
            return User(
                id=self.other_user_id,
                email="other-jobs@example.com",
                name="Other User",
                google_id="other-jobs-google",
            )

        app.dependency_overrides[get_current_user] = override_other_user
        try:
            polled = self.client.get(f"/api/analysis-jobs/{job_id}")
            self.assertEqual(polled.status_code, 404)
        finally:
            app.dependency_overrides[get_current_user] = lambda: User(
                id=self.user_id,
                email="jobs@example.com",
                name="Jobs User",
                google_id="jobs-google",
            )


if __name__ == "__main__":
    unittest.main()
