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
        with patch.object(app_main.settings, "app_env", "development"), patch.object(
            app_main.settings,
            "db_startup_strict",
            True,
        ), patch.object(
            app_main.Base.metadata,
            "create_all",
            return_value=None,
        ) as create_all_mock:
            with TestClient(app_main.app) as client:
                response = client.get("/")
                self.assertEqual(response.status_code, 200)
                self.assertTrue(app_main.app.state.db_startup_ready)

            self.assertEqual(create_all_mock.call_count, 1)

    def test_production_verifies_migrations_without_create_all(self):
        with patch.object(app_main.settings, "app_env", "production"), patch.object(
            app_main,
            "verify_database_migrations_current",
            return_value=True,
        ) as verify_mock, patch.object(app_main.Base.metadata, "create_all") as create_all_mock:
            with TestClient(app_main.app) as client:
                response = client.get("/")
                self.assertEqual(response.status_code, 200)
                self.assertTrue(app_main.app.state.db_startup_ready)

            verify_mock.assert_called_once_with()
            create_all_mock.assert_not_called()

    def test_production_raises_when_migrations_are_outdated(self):
        with patch.object(app_main.settings, "app_env", "production"), patch.object(
            app_main,
            "verify_database_migrations_current",
            side_effect=RuntimeError("Database schema is not migrated to Alembic head"),
        ):
            with self.assertRaises(RuntimeError):
                with TestClient(app_main.app):
                    pass


if __name__ == "__main__":
    unittest.main()
