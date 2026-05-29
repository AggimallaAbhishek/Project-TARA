import os
import pathlib
import tempfile

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

from app.config import get_settings


BACKEND_ROOT = pathlib.Path(__file__).resolve().parents[1]


def test_initial_alembic_migration_creates_expected_tables():
    db_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    db_file.close()
    database_url = f"sqlite:///{db_file.name}"
    previous_database_url = os.environ.get("DATABASE_URL")

    try:
        os.environ["DATABASE_URL"] = database_url
        get_settings.cache_clear()

        config = Config(str(BACKEND_ROOT / "alembic.ini"))
        config.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
        config.set_main_option("sqlalchemy.url", database_url)
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
