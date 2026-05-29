"""Repair partially-migrated schema states and upgrade to Alembic head."""

from __future__ import annotations

import sys
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.config import get_settings  # noqa: E402

BASE_REVISION = "71e37a512863"
SUMMARY_TABLES = ("users", "projects", "analyses", "threats", "audit_logs")


def _create_engine():
    settings = get_settings()
    engine_kwargs = {}
    if settings.database_url.startswith("sqlite"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}
    return create_engine(settings.database_url, **engine_kwargs)


def _build_alembic_config() -> Config:
    settings = get_settings()
    config = Config(str(PROJECT_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(PROJECT_ROOT / "alembic"))
    config.set_main_option("sqlalchemy.url", settings.database_url)
    return config


def _summarize_database(engine, *, label: str) -> dict[str, object]:
    with engine.connect() as connection:
        inspector = inspect(connection)
        table_names = set(inspector.get_table_names())
        user_tables = sorted(name for name in table_names if not name.startswith("sqlite_"))

        row_counts: dict[str, int] = {}
        for table_name in SUMMARY_TABLES:
            if table_name in table_names:
                row_counts[table_name] = int(connection.execute(text(f"SELECT COUNT(*) FROM {table_name}")).scalar_one())

        revisions: list[str] = []
        if "alembic_version" in table_names:
            revisions = [str(row[0]) for row in connection.execute(text("SELECT version_num FROM alembic_version")).all()]

        analyses_columns = set()
        audit_columns = set()
        if "analyses" in table_names:
            analyses_columns = {column["name"] for column in inspector.get_columns("analyses")}
        if "audit_logs" in table_names:
            audit_columns = {column["name"] for column in inspector.get_columns("audit_logs")}

        summary = {
            "label": label,
            "tables": user_tables,
            "row_counts": row_counts,
            "alembic_versions": revisions,
            "has_analyses_project_id": "project_id" in analyses_columns,
            "has_audit_project_id": "project_id" in audit_columns,
        }

    print(f"[{label}] tables={summary['tables']}")
    print(f"[{label}] row_counts={summary['row_counts']}")
    print(f"[{label}] alembic_versions={summary['alembic_versions']}")
    print(
        f"[{label}] analyses.project_id={summary['has_analyses_project_id']} "
        f"audit_logs.project_id={summary['has_audit_project_id']}"
    )
    return summary


def _needs_base_stamp(summary: dict[str, object]) -> bool:
    tables = set(summary["tables"])
    has_schema_objects = bool(tables - {"alembic_version"})
    has_alembic_version = "alembic_version" in tables
    return has_schema_objects and not has_alembic_version


def main() -> int:
    get_settings.cache_clear()
    engine = _create_engine()
    config = _build_alembic_config()

    try:
        before = _summarize_database(engine, label="before")
        if _needs_base_stamp(before):
            print(
                "[repair] detected existing schema without alembic_version; "
                f"stamping base revision {BASE_REVISION}"
            )
            command.stamp(config, BASE_REVISION)
        else:
            print("[repair] no base stamp required")

        print("[repair] running alembic upgrade head")
        command.upgrade(config, "head")
        _summarize_database(engine, label="after")
    except Exception as exc:
        print(f"[repair] failed: {exc}", file=sys.stderr)
        return 1
    finally:
        engine.dispose()
        get_settings.cache_clear()

    print("[repair] complete")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
