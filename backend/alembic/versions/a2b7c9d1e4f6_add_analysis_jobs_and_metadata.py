"""add_analysis_jobs_and_metadata

Revision ID: a2b7c9d1e4f6
Revises: f1a9f2c3d4e5
Create Date: 2026-06-05 14:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a2b7c9d1e4f6"
down_revision: Union[str, Sequence[str], None] = "f1a9f2c3d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(inspector: sa.Inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()


def _column_exists(inspector: sa.Inspector, table_name: str, column_name: str) -> bool:
    return any(column.get("name") == column_name for column in inspector.get_columns(table_name))


def _index_exists(inspector: sa.Inspector, table_name: str, index_name: str) -> bool:
    return any(index.get("name") == index_name for index in inspector.get_indexes(table_name))


def _refresh_inspector() -> sa.Inspector:
    return sa.inspect(op.get_bind())


def _add_column_if_missing(table_name: str, column: sa.Column) -> None:
    inspector = _refresh_inspector()
    if _table_exists(inspector, table_name) and not _column_exists(inspector, table_name, column.name):
        op.add_column(table_name, column)


def _create_index_if_missing(index_name: str, table_name: str, columns: list[str], *, unique: bool = False) -> None:
    inspector = _refresh_inspector()
    if _table_exists(inspector, table_name) and not _index_exists(inspector, table_name, index_name):
        op.create_index(index_name, table_name, columns, unique=unique)


def upgrade() -> None:
    inspector = _refresh_inspector()

    if _table_exists(inspector, "analyses"):
        _add_column_if_missing("analyses", sa.Column("source_type", sa.String(length=64), nullable=True))
        _add_column_if_missing("analyses", sa.Column("source_metadata", sa.JSON(), nullable=True))
        _add_column_if_missing("analyses", sa.Column("structured_context", sa.JSON(), nullable=True))
        _add_column_if_missing("analyses", sa.Column("quality_warnings", sa.JSON(), nullable=True))
        op.execute("UPDATE analyses SET source_type = 'text' WHERE source_type IS NULL")

    if _table_exists(inspector, "threats"):
        _add_column_if_missing("threats", sa.Column("evidence", sa.JSON(), nullable=True))
        _add_column_if_missing("threats", sa.Column("assumptions", sa.JSON(), nullable=True))
        _add_column_if_missing("threats", sa.Column("confidence", sa.Float(), nullable=True))
        _add_column_if_missing("threats", sa.Column("owasp_tags", sa.JSON(), nullable=True))
        _add_column_if_missing("threats", sa.Column("cwe_tags", sa.JSON(), nullable=True))

    inspector = _refresh_inspector()
    if not _table_exists(inspector, "analysis_jobs"):
        op.create_table(
            "analysis_jobs",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("job_id", sa.String(length=64), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("analysis_id", sa.Integer(), nullable=True),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("stage", sa.String(length=64), nullable=False),
            sa.Column("progress_percent", sa.Float(), nullable=False),
            sa.Column("source_type", sa.String(length=64), nullable=False),
            sa.Column("payload", sa.JSON(), nullable=True),
            sa.Column("error", sa.Text(), nullable=True),
            sa.Column("staged_file_path", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["analysis_id"], ["analyses.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    _create_index_if_missing("ix_analysis_jobs_id", "analysis_jobs", ["id"])
    _create_index_if_missing("ix_analysis_jobs_job_id", "analysis_jobs", ["job_id"], unique=True)
    _create_index_if_missing("ix_analysis_jobs_user_id", "analysis_jobs", ["user_id"])
    _create_index_if_missing("ix_analysis_jobs_analysis_id", "analysis_jobs", ["analysis_id"])
    _create_index_if_missing("ix_analysis_jobs_status", "analysis_jobs", ["status"])
    _create_index_if_missing("ix_analysis_jobs_created_at", "analysis_jobs", ["created_at"])
    _create_index_if_missing("ix_analysis_jobs_updated_at", "analysis_jobs", ["updated_at"])


def downgrade() -> None:
    inspector = _refresh_inspector()
    if _table_exists(inspector, "analysis_jobs"):
        for index_name in (
            "ix_analysis_jobs_updated_at",
            "ix_analysis_jobs_created_at",
            "ix_analysis_jobs_status",
            "ix_analysis_jobs_analysis_id",
            "ix_analysis_jobs_user_id",
            "ix_analysis_jobs_job_id",
            "ix_analysis_jobs_id",
        ):
            if _index_exists(_refresh_inspector(), "analysis_jobs", index_name):
                op.drop_index(index_name, table_name="analysis_jobs")
        op.drop_table("analysis_jobs")

    for table_name, column_names in (
        ("threats", ["cwe_tags", "owasp_tags", "confidence", "assumptions", "evidence"]),
        ("analyses", ["quality_warnings", "structured_context", "source_metadata", "source_type"]),
    ):
        inspector = _refresh_inspector()
        if not _table_exists(inspector, table_name):
            continue
        for column_name in column_names:
            if _column_exists(_refresh_inspector(), table_name, column_name):
                op.drop_column(table_name, column_name)
