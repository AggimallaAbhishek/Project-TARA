import pathlib
import sys
import unittest


PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.services.extract_session_service import ExtractSessionService


class ExtractSessionServiceTest(unittest.TestCase):
    def test_session_enforces_user_ownership_and_ttl(self):
        now_ref = [1000.0]
        service = ExtractSessionService(
            ttl_seconds=5,
            now_fn=lambda: now_ref[0],
        )

        extract_id = service.create_session(
            user_id=42,
            extracted_system_description="Architecture description",
            source_metadata={"input_type": "mermaid"},
        )

        owned_payload = service.get_session(extract_id=extract_id, user_id=42)
        self.assertIsNotNone(owned_payload)
        self.assertEqual(owned_payload["extracted_system_description"], "Architecture description")

        foreign_payload = service.get_session(extract_id=extract_id, user_id=7)
        self.assertIsNone(foreign_payload)

        now_ref[0] += 6
        expired_payload = service.get_session(extract_id=extract_id, user_id=42)
        self.assertIsNone(expired_payload)


if __name__ == "__main__":
    unittest.main()
