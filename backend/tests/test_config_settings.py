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


if __name__ == "__main__":
    unittest.main()
