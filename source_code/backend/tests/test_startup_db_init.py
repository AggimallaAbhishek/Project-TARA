import pathlib
import sys
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient


PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app import main as app_main


class StartupDbInitTest(unittest.TestCase):
    def test_degraded_mode_continues_when_db_init_fails(self):
        with patch.object(app_main.settings, "db_startup_strict", False), patch.object(
            app_main.Base.metadata,
            "create_all",
            side_effect=RuntimeError("db unavailable"),
        ):
            with TestClient(app_main.app) as client:
                response = client.get("/")
                self.assertEqual(response.status_code, 200)
                self.assertFalse(app_main.app.state.db_startup_ready)

    def test_strict_mode_raises_when_db_init_fails(self):
        with patch.object(app_main.settings, "db_startup_strict", True), patch.object(
            app_main.Base.metadata,
            "create_all",
            side_effect=RuntimeError("db unavailable"),
        ):
            with self.assertRaises(RuntimeError):
                with TestClient(app_main.app):
                    pass

    def test_startup_initializes_tables_when_db_is_available(self):
        with patch.object(app_main.settings, "db_startup_strict", True), patch.object(
            app_main.Base.metadata,
            "create_all",
            return_value=None,
        ) as create_all_mock:
            with TestClient(app_main.app) as client:
                response = client.get("/")
                self.assertEqual(response.status_code, 200)
                self.assertTrue(app_main.app.state.db_startup_ready)

            self.assertEqual(create_all_mock.call_count, 1)


if __name__ == "__main__":
    unittest.main()
