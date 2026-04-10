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
from app.services.auth_service import get_current_user
from app.services.llm_service import llm_service
from app.services.rate_limit_service import analyze_rate_limiter


class AnalysisApiRateLimitTest(unittest.TestCase):
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
        test_user = User(
            email="rate-limit-user@example.com",
            name="Rate Limit User",
            google_id="rate-limit-google-id",
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        cls.user_id = test_user.id
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
                email="rate-limit-user@example.com",
                name="Rate Limit User",
                google_id="rate-limit-google-id",
            )

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user] = override_get_current_user

        async def fake_analyze_system(_system_description: str):
            return (
                [
                    {
                        "name": "Spoofing via weak auth",
                        "description": "Attacker may impersonate user sessions.",
                        "stride_category": "Spoofing",
                        "affected_component": "Authentication service",
                        "likelihood": 3,
                        "impact": 4,
                        "mitigation": "Use strong session controls and MFA.",
                    }
                ],
                0.01,
            )

        cls._original_analyze_system = llm_service.analyze_system
        llm_service.analyze_system = fake_analyze_system

        cls._original_now_fn = analyze_rate_limiter.now_fn
        cls._original_window_seconds = analyze_rate_limiter.window_seconds
        cls._time_ref = [1000.0]
        analyze_rate_limiter.now_fn = lambda: cls._time_ref[0]
        analyze_rate_limiter.window_seconds = 60
        analyze_rate_limiter.clear()

        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        llm_service.analyze_system = cls._original_analyze_system
        analyze_rate_limiter.now_fn = cls._original_now_fn
        analyze_rate_limiter.window_seconds = cls._original_window_seconds
        analyze_rate_limiter.clear()
        app.dependency_overrides.clear()
        cls.client.close()
        cls.engine.dispose()
        os.unlink(cls.temp_db_path)

    def setUp(self):
        analyze_rate_limiter.clear()
        self.__class__._time_ref[0] = 1000.0

    @staticmethod
    def _payload(index: int = 0):
        return {
            "title": f"Rate Limit Analysis {index}",
            "system_description": "This system has API, auth, and data services with external integrations.",
        }

    def test_allows_requests_within_limit(self):
        for i in range(5):
            response = self.client.post("/api/analyze", json=self._payload(i))
            self.assertEqual(response.status_code, 201)

    def test_blocks_when_limit_exceeded(self):
        for i in range(5):
            response = self.client.post("/api/analyze", json=self._payload(i))
            self.assertEqual(response.status_code, 201)

        blocked_response = self.client.post("/api/analyze", json=self._payload(99))
        self.assertEqual(blocked_response.status_code, 429)
        self.assertEqual(
            blocked_response.json()["detail"],
            "Rate limit exceeded. Maximum 5 analyze requests per minute.",
        )
        self.assertIn("Retry-After", blocked_response.headers)

    def test_allows_again_after_window_resets(self):
        for i in range(5):
            response = self.client.post("/api/analyze", json=self._payload(i))
            self.assertEqual(response.status_code, 201)

        blocked_response = self.client.post("/api/analyze", json=self._payload(200))
        self.assertEqual(blocked_response.status_code, 429)

        self.__class__._time_ref[0] += 61
        recovered_response = self.client.post("/api/analyze", json=self._payload(201))
        self.assertEqual(recovered_response.status_code, 201)


if __name__ == "__main__":
    unittest.main()
