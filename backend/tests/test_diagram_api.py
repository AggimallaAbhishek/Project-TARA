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
from app.services.diagram_extract_service import DiagramExtractionError, diagram_extract_service
from app.services.extract_session_service import extract_session_service
from app.services.llm_service import llm_service
from app.services.rate_limit_service import diagram_analyze_rate_limiter, diagram_extract_rate_limiter


class DiagramApiTest(unittest.TestCase):
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
            email="diagram-test-user@example.com",
            name="Diagram Test User",
            google_id="diagram-test-google-id",
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
                email="diagram-test-user@example.com",
                name="Diagram Test User",
                google_id="diagram-test-google-id",
            )

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user] = override_get_current_user

        async def fake_analyze_system(_system_description: str):
            return (
                [
                    {
                        "name": "Token replay",
                        "description": "Attacker can replay a bearer token.",
                        "stride_category": "Spoofing",
                        "affected_component": "Auth Gateway",
                        "likelihood": 3,
                        "impact": 4,
                        "mitigation": "Rotate tokens and enforce short expiry.",
                    }
                ],
                0.02,
            )

        cls._original_analyze_system = llm_service.analyze_system
        llm_service.analyze_system = fake_analyze_system

        cls._original_extract_from_upload = diagram_extract_service.extract_from_upload

        async def fake_extract_from_upload(*, file_name: str, content_type: str | None, file_bytes: bytes):
            return (
                "Extracted architecture text with gateway, auth service, and database.",
                {
                    "input_type": "mermaid",
                    "file_name": file_name,
                    "file_size": len(file_bytes),
                    "pages_processed": None,
                    "extractor_used": "mermaid_parser_v1",
                },
            )

        diagram_extract_service.extract_from_upload = fake_extract_from_upload

        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        llm_service.analyze_system = cls._original_analyze_system
        diagram_extract_service.extract_from_upload = cls._original_extract_from_upload
        extract_session_service.clear()
        diagram_extract_rate_limiter.clear()
        diagram_analyze_rate_limiter.clear()
        app.dependency_overrides.clear()
        cls.client.close()
        cls.engine.dispose()
        os.unlink(cls.temp_db_path)

    def setUp(self):
        extract_session_service.clear()
        diagram_extract_rate_limiter.clear()
        diagram_analyze_rate_limiter.clear()

    def test_extract_then_analyze_happy_path(self):
        extract_response = self.client.post(
            "/api/diagram/extract",
            files={"file": ("architecture.mmd", b"graph TD\nA-->B", "text/plain")},
        )
        self.assertEqual(extract_response.status_code, 200)
        payload = extract_response.json()
        self.assertIn("extract_id", payload)
        self.assertEqual(payload["source_metadata"]["input_type"], "mermaid")

        analyze_response = self.client.post(
            "/api/diagram/analyze",
            json={
                "title": "Diagram Analysis",
                "extract_id": payload["extract_id"],
                "system_description": "Edited architecture description with gateway and auth service.",
            },
        )
        self.assertEqual(analyze_response.status_code, 201)
        analysis = analyze_response.json()
        self.assertEqual(analysis["title"], "Diagram Analysis")
        self.assertEqual(len(analysis["threats"]), 1)

    def test_analyze_rejects_missing_extract_session(self):
        response = self.client.post(
            "/api/diagram/analyze",
            json={
                "title": "Missing Session",
                "extract_id": "missing-session-id",
            },
        )
        self.assertEqual(response.status_code, 404)

    def test_analyze_rejects_foreign_extract_session(self):
        foreign_extract_id = extract_session_service.create_session(
            user_id=999,
            extracted_system_description="Foreign extract text with enough detail.",
            source_metadata={"input_type": "mermaid"},
        )
        response = self.client.post(
            "/api/diagram/analyze",
            json={
                "title": "Foreign Session",
                "extract_id": foreign_extract_id,
            },
        )
        self.assertEqual(response.status_code, 404)

    def test_extract_rejects_oversized_file(self):
        oversized_payload = b"x" * ((10 * 1024 * 1024) + 1)
        response = self.client.post(
            "/api/diagram/extract",
            files={"file": ("big.mmd", oversized_payload, "text/plain")},
        )
        self.assertEqual(response.status_code, 413)

    def test_extract_rejects_invalid_file(self):
        with patch.object(
            diagram_extract_service,
            "extract_from_upload",
            new=AsyncMock(side_effect=DiagramExtractionError("Unsupported file type.")),
        ):
            response = self.client.post(
                "/api/diagram/extract",
                files={"file": ("payload.bin", b"raw", "application/octet-stream")},
            )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Unsupported file type.")

    def test_extract_reports_runtime_failure(self):
        with patch.object(
            diagram_extract_service,
            "extract_from_upload",
            new=AsyncMock(side_effect=RuntimeError("OLLAMA_VISION_MODEL is not configured.")),
        ):
            response = self.client.post(
                "/api/diagram/extract",
                files={"file": ("architecture.png", b"\x89PNG\r\n\x1a\n", "image/png")},
            )
        self.assertEqual(response.status_code, 503)


if __name__ == "__main__":
    unittest.main()
