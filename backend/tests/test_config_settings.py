import pathlib
import sys
import unittest

from pydantic import ValidationError


PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.config import Settings


class SettingsConfigTest(unittest.TestCase):
    def test_legacy_google_client_secret_is_accepted(self):
        settings = Settings(google_client_secret="legacy-secret")
        self.assertEqual(settings.google_client_secret, "legacy-secret")

    def test_unknown_field_is_rejected(self):
        with self.assertRaises(ValidationError):
            Settings(unknown_setting="value")

    def test_retry_settings_defaults_are_available(self):
        settings = Settings()
        self.assertTrue(settings.ollama_retry_on_invalid_response)
        self.assertEqual(settings.ollama_retry_num_predict, 4096)

    def test_db_startup_strict_derives_from_environment(self):
        dev_settings = Settings(app_env="development", db_startup_strict=None)
        prod_settings = Settings(app_env="production", db_startup_strict=None)
        self.assertFalse(dev_settings.is_db_startup_strict)
        self.assertTrue(prod_settings.is_db_startup_strict)

    def test_db_startup_strict_explicit_override_is_respected(self):
        settings = Settings(app_env="production", db_startup_strict=False)
        self.assertFalse(settings.is_db_startup_strict)

    def test_document_upload_settings_defaults_are_available(self):
        settings = Settings()
        self.assertEqual(settings.document_max_upload_mb, 10)
        self.assertEqual(settings.document_pdf_max_pages, 20)


if __name__ == "__main__":
    unittest.main()
