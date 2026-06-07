"""add_projects

Revision ID: 9f4a2c1b7d30
Revises: 71e37a512863
Create Date: 2026-05-29 00:00:00.000000

"""
from datetime import datetime, timezone
import re
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9f4a2c1b7d30"
down_revision: Union[str, Sequence[str], None] = "71e37a512863"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


ANALYSIS_PROJECT_FK_NAME = "fk_analyses_project_id_projects"
PROJECT_NAME_UNIQUE_CONSTRAINT = "uq_projects_user_normalized_name"

PROJECT_INDEXES = (
    "ix_projects_created_at",
    "ix_projects_id",
    "ix_projects_normalized_name",
    "ix_projects_updated_at",
    "ix_projects_user_id",
)


def _utc_now_for_db() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

projects_table = sa.table(
    "projects",
    sa.column("id", sa.Integer()),
    sa.column("user_id", sa.Integer()),
    sa.column("name", sa.String(length=255)),
    sa.column("normalized_name", sa.String(length=255)),
    sa.column("description", sa.Text()),
    sa.column("created_at", sa.DateTime()),
    sa.column("updated_at", sa.DateTime()),
)


def _normalize_name(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip().lower()


def _display_name(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip() or "Untitled Project"


def _table_exists(inspector: sa.Inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()


def _column_exists(inspector: sa.Inspector, table_name: str, column_name: str) -> bool:
    return any(column.get("name") == column_name for column in inspector.get_columns(table_name))


def _index_exists(inspector: sa.Inspector, table_name: str, index_name: str) -> bool:
    return any(index.get("name") == index_name for index in inspector.get_indexes(table_name))


def _unique_constraint_exists(inspector: sa.Inspector, table_name: str, constraint_name: str) -> bool:
    return any(constraint.get("name") == constraint_name for constraint in inspector.get_unique_constraints(table_name))


def _foreign_key_exists(inspector: sa.Inspector, table_name: str, fk_name: str) -> bool:
    return any(fk.get("name") == fk_name for fk in inspector.get_foreign_keys(table_name))


def _refresh_inspector() -> sa.Inspector:
    return sa.inspect(op.get_bind())


def _backfill_projects() -> None:
    bind = op.get_bind()

    project_lookup: dict[tuple[int, str], int] = {}
    existing_projects = list(
        bind.execute(
            sa.text(
                """
                SELECT id, user_id, normalized_name
                FROM projects
                """
            )
        ).mappings()
    )
    for existing_project in existing_projects:
        project_lookup[(existing_project["user_id"], existing_project["normalized_name"])] = existing_project["id"]

    analyses = list(
        bind.execute(
            sa.text(
                """
                SELECT id, user_id, title, created_at, updated_at, project_id
                FROM analyses
                ORDER BY user_id ASC, created_at ASC, id ASC
                """
            )
        ).mappings()
    )

    for analysis in analyses:
        if analysis["project_id"] is not None:
            continue

        display_name = _display_name(analysis["title"])
        normalized_name = _normalize_name(display_name)
        key = (analysis["user_id"], normalized_name)
        project_id = project_lookup.get(key)

        if project_id is None:
            timestamp = analysis["created_at"] or _utc_now_for_db()
            result = bind.execute(
                projects_table.insert().values(
                    user_id=analysis["user_id"],
                    name=display_name,
                    normalized_name=normalized_name,
                    description=None,
                    created_at=timestamp,
                    updated_at=analysis["updated_at"] or timestamp,
                )
            )
            inserted_primary_key = list(result.inserted_primary_key or [])
            if inserted_primary_key and inserted_primary_key[0] is not None:
                project_id = inserted_primary_key[0]
            else:
                project_id = bind.execute(
                    sa.text(
                        """
                        SELECT id
                        FROM projects
                        WHERE user_id = :user_id
                          AND normalized_name = :normalized_name
                        ORDER BY id DESC
                        LIMIT 1
                        """
                    ),
                    {
                        "user_id": analysis["user_id"],
                        "normalized_name": normalized_name,
                    },
                ).scalar_one()
            project_lookup[key] = project_id

        bind.execute(
            sa.text("UPDATE analyses SET project_id = :project_id WHERE id = :analysis_id"),
            {"project_id": project_id, "analysis_id": analysis["id"]},
        )

    bind.execute(
        sa.text(
            """
            UPDATE audit_logs
            SET project_id = (
                SELECT analyses.project_id
                FROM analyses
                WHERE analyses.id = audit_logs.analysis_id
            )
            WHERE analysis_id IS NOT NULL
            """
        )
    )


def _ensure_project_table_and_indexes(inspector: sa.Inspector) -> sa.Inspector:
    if not _table_exists(inspector, "projects"):
        op.create_table(
            "projects",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("normalized_name", sa.String(length=255), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", "normalized_name", name=PROJECT_NAME_UNIQUE_CONSTRAINT),
        )
        inspector = _refresh_inspector()

    if not _unique_constraint_exists(inspector, "projects", PROJECT_NAME_UNIQUE_CONSTRAINT):
        with op.batch_alter_table("projects") as batch_op:
            batch_op.create_unique_constraint(
                PROJECT_NAME_UNIQUE_CONSTRAINT,
                ["user_id", "normalized_name"],
            )
        inspector = _refresh_inspector()

    for index_name, columns in (
        ("ix_projects_created_at", ["created_at"]),
        ("ix_projects_id", ["id"]),
        ("ix_projects_normalized_name", ["normalized_name"]),
        ("ix_projects_updated_at", ["updated_at"]),
        ("ix_projects_user_id", ["user_id"]),
    ):
        if not _index_exists(inspector, "projects", index_name):
            op.create_index(index_name, "projects", columns, unique=False)

    return _refresh_inspector()


def _ensure_analysis_project_column(inspector: sa.Inspector) -> sa.Inspector:
    if not _column_exists(inspector, "analyses", "project_id"):
        op.add_column("analyses", sa.Column("project_id", sa.Integer(), nullable=True))
        inspector = _refresh_inspector()

    if not _index_exists(inspector, "analyses", "ix_analyses_project_id"):
        op.create_index("ix_analyses_project_id", "analyses", ["project_id"], unique=False)
        inspector = _refresh_inspector()

    return inspector


def _enforce_analysis_project_constraints(inspector: sa.Inspector) -> None:
    # Fail clearly if backfill missed rows; nullable=False should never be forced with NULL values.
    bind = op.get_bind()
    null_count = bind.execute(sa.text("SELECT COUNT(*) FROM analyses WHERE project_id IS NULL")).scalar_one()
    if null_count:
        raise RuntimeError(f"analyses.project_id backfill incomplete: {null_count} rows still NULL")

    project_id_column = next(column for column in inspector.get_columns("analyses") if column["name"] == "project_id")
    if project_id_column.get("nullable", True):
        with op.batch_alter_table("analyses") as batch_op:
            batch_op.alter_column("project_id", existing_type=sa.Integer(), nullable=False)
        inspector = _refresh_inspector()

    if not _foreign_key_exists(inspector, "analyses", ANALYSIS_PROJECT_FK_NAME):
        with op.batch_alter_table("analyses") as batch_op:
            batch_op.create_foreign_key(
                ANALYSIS_PROJECT_FK_NAME,
                "projects",
                ["project_id"],
                ["id"],
            )


def _ensure_audit_project_column(inspector: sa.Inspector) -> None:
    if not _column_exists(inspector, "audit_logs", "project_id"):
        op.add_column("audit_logs", sa.Column("project_id", sa.Integer(), nullable=True))
        inspector = _refresh_inspector()

    if not _index_exists(inspector, "audit_logs", "ix_audit_logs_project_id"):
        op.create_index("ix_audit_logs_project_id", "audit_logs", ["project_id"], unique=False)


def upgrade() -> None:
    """Upgrade schema."""
    inspector = _refresh_inspector()
    inspector = _ensure_project_table_and_indexes(inspector)
    inspector = _ensure_analysis_project_column(inspector)
    _ensure_audit_project_column(inspector)
    _backfill_projects()
    _enforce_analysis_project_constraints(_refresh_inspector())


def downgrade() -> None:
    """Downgrade schema."""
    inspector = _refresh_inspector()
    if _table_exists(inspector, "analyses") and _foreign_key_exists(inspector, "analyses", ANALYSIS_PROJECT_FK_NAME):
        with op.batch_alter_table("analyses") as batch_op:
            batch_op.drop_constraint(ANALYSIS_PROJECT_FK_NAME, type_="foreignkey")
        inspector = _refresh_inspector()

    if _table_exists(inspector, "audit_logs") and _index_exists(inspector, "audit_logs", "ix_audit_logs_project_id"):
        op.drop_index("ix_audit_logs_project_id", table_name="audit_logs")
        inspector = _refresh_inspector()
    if _table_exists(inspector, "audit_logs") and _column_exists(inspector, "audit_logs", "project_id"):
        op.drop_column("audit_logs", "project_id")
        inspector = _refresh_inspector()

    if _table_exists(inspector, "analyses") and _index_exists(inspector, "analyses", "ix_analyses_project_id"):
        op.drop_index("ix_analyses_project_id", table_name="analyses")
        inspector = _refresh_inspector()
    if _table_exists(inspector, "analyses") and _column_exists(inspector, "analyses", "project_id"):
        op.drop_column("analyses", "project_id")
        inspector = _refresh_inspector()

    if _table_exists(inspector, "projects"):
        for index_name in PROJECT_INDEXES:
            if _index_exists(inspector, "projects", index_name):
                op.drop_index(index_name, table_name="projects")
                inspector = _refresh_inspector()
        op.drop_table("projects")
