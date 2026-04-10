import os
import pathlib
import sys
import tempfile
import unittest
from unittest.mock import AsyncMock, patch

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
from app.services.document_extract_service import DocumentExtractionError, document_extract_service
from app.services.llm_service import llm_service
from app.services.rate_limit_service import document_analyze_rate_limiter


class DocumentApiTest(unittest.TestCase):
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
            email="document-test-user@example.com",
            name="Document Test User",
            google_id="document-test-google-id",
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
                email="document-test-user@example.com",
                name="Document Test User",
                google_id="document-test-google-id",
            )

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user] = override_get_current_user

        async def fake_extract_from_upload(*, file_name: str, content_type: str | None, file_bytes: bytes):
            _ = file_name, content_type
            extracted = file_bytes.decode("utf-8")
            return (
                extracted,
                {
                    "input_type": "txt",
                    "file_name": file_name,
                    "file_size": len(file_bytes),
                    "pages_processed": None,
                    "extractor_used": "test_extractor_v1",
                },
            )

        async def fake_analyze_system(system_description: str):
            if "v1" in system_description.lower():
                return (
                    [
                        {
                            "name": "Token Replay",
                            "description": "Replay attack risk.",
                            "stride_category": "Spoofing",
                            "affected_component": "API Gateway",
                            "risk_level": "High",
                            "likelihood": 3,
                            "impact": 4,
                            "mitigation": "Rotate tokens.",
                        },
                        {
                            "name": "SQL Injection",
                            "description": "Untrusted query input.",
                            "stride_category": "Tampering",
                            "affected_component": "Database",
                            "risk_level": "Critical",
                            "likelihood": 4,
                            "impact": 5,
                            "mitigation": "Use parameterized queries.",
                        },
                    ],
                    0.02,
                )
            return (
                [
                    {
                        "name": "Token Replay",
                        "description": "Replay attack risk still exists.",
                        "stride_category": "Spoofing",
                        "affected_component": "API Gateway",
                        "risk_level": "Medium",
                        "likelihood": 2,
                        "impact": 4,
                        "mitigation": "Rotate tokens and bind sessions.",
                    },
                    {
                        "name": "Privilege Escalation",
                        "description": "Weak admin permission boundaries.",
                        "stride_category": "Elevation of Privilege",
                        "affected_component": "Admin API",
                        "risk_level": "High",
                        "likelihood": 3,
                        "impact": 4,
                        "mitigation": "Enforce RBAC checks.",
                    },
                ],
                0.02,
            )

        cls._original_extract_from_upload = document_extract_service.extract_from_upload
        cls._original_analyze_system = llm_service.analyze_system
        document_extract_service.extract_from_upload = fake_extract_from_upload
        llm_service.analyze_system = fake_analyze_system

        cls._original_now_fn = document_analyze_rate_limiter.now_fn
        cls._original_window_seconds = document_analyze_rate_limiter.window_seconds
        cls._time_ref = [1000.0]
        document_analyze_rate_limiter.now_fn = lambda: cls._time_ref[0]
        document_analyze_rate_limiter.window_seconds = 60
        document_analyze_rate_limiter.clear()

        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        document_extract_service.extract_from_upload = cls._original_extract_from_upload
        llm_service.analyze_system = cls._original_analyze_system
        document_analyze_rate_limiter.now_fn = cls._original_now_fn
        document_analyze_rate_limiter.window_seconds = cls._original_window_seconds
        document_analyze_rate_limiter.clear()
        app.dependency_overrides.clear()
        cls.client.close()
        cls.engine.dispose()
        os.unlink(cls.temp_db_path)

    def setUp(self):
        document_analyze_rate_limiter.clear()
        self.__class__._time_ref[0] = 1000.0

    @staticmethod
    def _post_document(*, title: str, file_name: str, content: bytes, content_type: str = "text/plain"):
        return DocumentApiTest.client.post(
            "/api/document/analyze",
            data={"title": title},
            files={"file": (file_name, content, content_type)},
        )

    def test_first_upload_returns_baseline_version_comparison(self):
        response = self._post_document(
            title="Security Policy",
            file_name="policy.txt",
            content=b"v1 architecture details with gateway, auth, and database.",
        )
        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertIn("analysis", payload)
        self.assertIn("version_comparison", payload)
        self.assertFalse(payload["version_comparison"]["has_previous_version"])
        self.assertEqual(payload["version_comparison"]["new_issues_count"], 2)

    def test_second_upload_same_title_returns_resolved_unresolved_and_new_counts(self):
        first_response = self._post_document(
            title="Release Notes",
            file_name="release-v1.txt",
            content=b"v1 architecture details with gateway and database protections.",
        )
        self.assertEqual(first_response.status_code, 201)

        second_response = self._post_document(
            title="Release Notes",
            file_name="release-v2.txt",
            content=b"v2 architecture details with updated auth and admin api.",
        )
        self.assertEqual(second_response.status_code, 201)
        second_payload = second_response.json()

        report = second_payload["version_comparison"]
        self.assertTrue(report["has_previous_version"])
        self.assertEqual(report["previous_total_issues"], 2)
        self.assertEqual(report["resolved_issues_count"], 1)
        self.assertEqual(report["unresolved_issues_count"], 1)
        self.assertEqual(report["new_issues_count"], 1)

        analysis_id = second_payload["analysis"]["id"]
        get_response = self.client.get(f"/api/analyses/{analysis_id}/version-comparison")
        self.assertEqual(get_response.status_code, 200)
        get_report = get_response.json()
        self.assertEqual(get_report["resolved_issues_count"], 1)
        self.assertEqual(get_report["unresolved_issues_count"], 1)
        self.assertEqual(get_report["new_issues_count"], 1)

    def test_rejects_oversized_upload(self):
        oversized_payload = b"x" * ((10 * 1024 * 1024) + 1)
        response = self._post_document(
            title="Large Upload",
            file_name="large.txt",
            content=oversized_payload,
        )
        self.assertEqual(response.status_code, 413)

    def test_rejects_unsupported_document_type(self):
        with patch.object(
            document_extract_service,
            "extract_from_upload",
            new=AsyncMock(side_effect=DocumentExtractionError("Unsupported file type. Supported formats: PDF, TXT.")),
        ):
            response = self._post_document(
                title="Bad File",
                file_name="payload.exe",
                content=b"not supported",
                content_type="application/octet-stream",
            )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Unsupported file type", response.json()["detail"])

    def test_enforces_document_analyze_rate_limit(self):
        for index in range(5):
            response = self._post_document(
                title=f"Rate Limit {index}",
                file_name=f"rate-{index}.txt",
                content=b"v1 details for rate limit test payload.",
            )
            self.assertEqual(response.status_code, 201)

        blocked = self._post_document(
            title="Rate Limit blocked",
            file_name="rate-blocked.txt",
            content=b"v1 details for rate limit test payload.",
        )
        self.assertEqual(blocked.status_code, 429)
        self.assertIn("Retry-After", blocked.headers)


if __name__ == "__main__":
    unittest.main()
