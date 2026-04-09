import base64
from datetime import datetime
import pathlib
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch


PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.services.pdf_service import PDFReportService


class PDFServiceTest(unittest.TestCase):
    _ONE_PIXEL_PNG = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+M1wAAAAASUVORK5CYII="
    )

    @staticmethod
    def _build_analysis_fixture():
        threat = SimpleNamespace(
            id=1,
            name="User Authentication Bypass",
            description="Attacker bypasses auth checks.",
            stride_category="Spoofing",
            affected_component="Auth API",
            risk_level="High",
            likelihood=4,
            impact=3,
            risk_score=12.0,
            mitigation="1. Enable MFA\n2. Add lockout",
        )
        return SimpleNamespace(
            id=99,
            title="Banking App",
            system_description="Mobile app + backend + database.",
            created_at=datetime(2026, 4, 9, 12, 30, 0),
            total_risk_score=12.0,
            analysis_time=2.34,
            threats=[threat],
        )

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

    def test_resolve_branding_assets_finds_banner_and_logo(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = pathlib.Path(temp_dir)
            (temp_path / "banner.png").write_bytes(self._ONE_PIXEL_PNG)
            (temp_path / "logo.png").write_bytes(self._ONE_PIXEL_PNG)

            with patch.object(PDFReportService, "BRANDING_ASSET_DIR", temp_path):
                assets = PDFReportService._resolve_branding_assets()

        self.assertIn("banner", assets)
        self.assertIn("logo", assets)
        self.assertEqual(assets["banner"].name, "banner.png")
        self.assertEqual(assets["logo"].name, "logo.png")

    def test_build_analysis_pdf_with_branding_assets(self):
        analysis = self._build_analysis_fixture()
        service = PDFReportService()

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = pathlib.Path(temp_dir)
            (temp_path / "banner.png").write_bytes(self._ONE_PIXEL_PNG)
            (temp_path / "logo.png").write_bytes(self._ONE_PIXEL_PNG)

            with patch.object(PDFReportService, "BRANDING_ASSET_DIR", temp_path):
                pdf_bytes = service.build_analysis_pdf(analysis)

        self.assertTrue(pdf_bytes.startswith(b"%PDF"))
        self.assertGreater(len(pdf_bytes), 0)


if __name__ == "__main__":
    unittest.main()
