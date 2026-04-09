import pathlib
import sys
import unittest


PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.services.pdf_service import PDFReportService


class PDFServiceTest(unittest.TestCase):
    def test_sanitize_mitigation_text_removes_brackets_and_quotes(self):
        raw = (
            "1. ['Implement multi-factor authentication for all user accounts'.\n"
            "2. 'Use secure session management with proper token expiration'.\n"
            "3. 'Add rate limiting to authentication endpoints'.\n"
            "4. 'Implement account lockout mechanisms after failed attempts']."
        )

        sanitized = PDFReportService._sanitize_mitigation_text(raw)

        self.assertIn("1. Implement multi-factor authentication for all user accounts.", sanitized)
        self.assertIn("4. Implement account lockout mechanisms after failed attempts.", sanitized)
        self.assertNotIn("[", sanitized)
        self.assertNotIn("]", sanitized)
        self.assertNotIn("'", sanitized)


if __name__ == "__main__":
    unittest.main()
