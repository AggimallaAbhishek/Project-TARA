import os
import pathlib
import tempfile

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

from app.config import get_settings
from scripts.repair_schema_and_stamp import main as repair_schema_and_stamp_main


BACKEND_ROOT = pathlib.Path(__file__).resolve().parents[1]


def _build_alembic_config(database_url: str) -> Config:
    config = Config(str(BACKEND_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def test_initial_alembic_migration_creates_expected_tables():
    db_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    db_file.close()
    database_url = f"sqlite:///{db_file.name}"
    previous_database_url = os.environ.get("DATABASE_URL")

    try:
        os.environ["DATABASE_URL"] = database_url
        get_settings.cache_clear()

        config = _build_alembic_config(database_url)
        command.upgrade(config, "head")

        engine = create_engine(database_url)
        try:
            inspector = inspect(engine)
            tables = set(inspector.get_table_names())
            analysis_columns = {column["name"] for column in inspector.get_columns("analyses")}
            audit_columns = {column["name"] for column in inspector.get_columns("audit_logs")}
        finally:
            engine.dispose()

        assert {"users", "projects", "analyses", "threats", "audit_logs", "alembic_version"}.issubset(tables)
        assert "project_id" in analysis_columns
        assert "project_id" in audit_columns
    finally:
        if previous_database_url is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = previous_database_url
        get_settings.cache_clear()
        os.unlink(db_file.name)


def test_repair_script_handles_partial_schema_and_upgrades_to_head():
    db_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    db_file.close()
    database_url = f"sqlite:///{db_file.name}"
    previous_database_url = os.environ.get("DATABASE_URL")

    try:
        os.environ["DATABASE_URL"] = database_url
        get_settings.cache_clear()

        config = _build_alembic_config(database_url)
        command.upgrade(config, "71e37a512863")

        engine = create_engine(database_url)
        try:
            with engine.begin() as connection:
                connection.execute(
                    text(
                        """
                        INSERT INTO users (id, email, name, google_id)
                        VALUES (1, 'repair@example.com', 'Repair User', 'repair-google-id')
                        """
                    )
                )
                connection.execute(
                    text(
                        """
                        INSERT INTO analyses (
                            id, user_id, title, system_description, total_risk_score, analysis_time
                        )
                        VALUES (
                            1, 1, 'Banking Mobile App', 'Sample architecture', 10.5, 12.0
                        )
                        """
                    )
                )
                connection.execute(
                    text(
                        """
                        INSERT INTO audit_logs (id, user_id, analysis_id, action)
                        VALUES (1, 1, 1, 'analysis_created')
                        """
                    )
                )
                connection.execute(
                    text(
                        """
                        CREATE TABLE projects (
                            id INTEGER PRIMARY KEY,
                            user_id INTEGER NOT NULL,
                            name VARCHAR(255) NOT NULL,
                            normalized_name VARCHAR(255) NOT NULL,
                            description TEXT,
                            created_at DATETIME,
                            updated_at DATETIME
                        )
                        """
                    )
                )
                connection.execute(text("DROP TABLE alembic_version"))

            exit_code = repair_schema_and_stamp_main()
            assert exit_code == 0

            inspector = inspect(engine)
            tables = set(inspector.get_table_names())
            analysis_columns = {column["name"] for column in inspector.get_columns("analyses")}
            audit_columns = {column["name"] for column in inspector.get_columns("audit_logs")}

            assert {"users", "projects", "analyses", "threats", "audit_logs", "alembic_version"}.issubset(tables)
            assert "project_id" in analysis_columns
            assert "project_id" in audit_columns

            with engine.connect() as connection:
                assert connection.execute(text("SELECT COUNT(*) FROM projects")).scalar_one() == 1
                assert connection.execute(text("SELECT COUNT(*) FROM analyses WHERE project_id IS NULL")).scalar_one() == 0
                assert connection.execute(text("SELECT project_id FROM analyses WHERE id = 1")).scalar_one() is not None
                assert connection.execute(text("SELECT project_id FROM audit_logs WHERE id = 1")).scalar_one() is not None
        finally:
            engine.dispose()
    finally:
        if previous_database_url is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = previous_database_url
        get_settings.cache_clear()
        os.unlink(db_file.name)
