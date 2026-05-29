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
            tables = set(inspect(engine).get_table_names())
        finally:
            engine.dispose()

        assert {"users", "analyses", "threats", "audit_logs", "alembic_version"}.issubset(tables)
    finally:
        if previous_database_url is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = previous_database_url
        get_settings.cache_clear()
        os.unlink(db_file.name)
