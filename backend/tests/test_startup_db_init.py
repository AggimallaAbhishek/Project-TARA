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
    def test_development_empty_schema_auto_migrates(self):
        with patch.object(app_main.settings, "app_env", "development"), patch.object(
            app_main,
            "_get_user_table_names",
            return_value=set(),
        ), patch.object(
            app_main,
            "_run_alembic_upgrade_head",
            return_value=None,
        ) as upgrade_mock, patch.object(
            app_main,
            "verify_database_migrations_current",
            return_value=True,
        ) as verify_mock:
            with TestClient(app_main.app) as client:
                response = client.get("/")
                self.assertEqual(response.status_code, 200)
                self.assertTrue(app_main.app.state.db_startup_ready)

            upgrade_mock.assert_called_once_with()
            verify_mock.assert_called_once_with()

    def test_development_non_empty_without_alembic_version_fails_with_repair_instruction(self):
        with patch.object(app_main.settings, "app_env", "development"), patch.object(
            app_main,
            "_get_user_table_names",
            return_value={"users", "analyses", "projects"},
        ):
            with self.assertRaisesRegex(RuntimeError, r"repair_schema_and_stamp\.py"):
                with TestClient(app_main.app):
                    pass

    def test_development_migration_managed_schema_runs_upgrade_and_verify(self):
        with patch.object(app_main.settings, "app_env", "development"), patch.object(
            app_main,
            "_get_user_table_names",
            return_value={"alembic_version", "users", "analyses"},
        ), patch.object(
            app_main,
            "_run_alembic_upgrade_head",
            return_value=None,
        ) as upgrade_mock, patch.object(
            app_main,
            "verify_database_migrations_current",
            return_value=True,
        ) as verify_mock:
            with TestClient(app_main.app) as client:
                response = client.get("/")
                self.assertEqual(response.status_code, 200)
                self.assertTrue(app_main.app.state.db_startup_ready)

            upgrade_mock.assert_called_once_with()
            verify_mock.assert_called_once_with()

    def test_production_verifies_migrations_without_create_all(self):
        with patch.object(app_main.settings, "app_env", "production"), patch.object(
            app_main,
            "verify_database_migrations_current",
            return_value=True,
        ) as verify_mock, patch.object(app_main, "_run_alembic_upgrade_head") as upgrade_mock:
            with TestClient(app_main.app) as client:
                response = client.get("/")
                self.assertEqual(response.status_code, 200)
                self.assertTrue(app_main.app.state.db_startup_ready)

            verify_mock.assert_called_once_with()
            upgrade_mock.assert_not_called()

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
