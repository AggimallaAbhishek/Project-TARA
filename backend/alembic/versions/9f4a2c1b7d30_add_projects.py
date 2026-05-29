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


def _backfill_projects() -> None:
    bind = op.get_bind()
    analyses = list(
        bind.execute(
            sa.text(
                """
                SELECT id, user_id, title, created_at, updated_at
                FROM analyses
                ORDER BY user_id ASC, created_at ASC, id ASC
                """
            )
        ).mappings()
    )

    project_lookup: dict[tuple[int, str], int] = {}
    for analysis in analyses:
        display_name = _display_name(analysis["title"])
        normalized_name = _normalize_name(display_name)
        key = (analysis["user_id"], normalized_name)
        project_id = project_lookup.get(key)

        if project_id is None:
            timestamp = analysis["created_at"] or datetime.now(timezone.utc)
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
            project_id = result.inserted_primary_key[0]
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


def upgrade() -> None:
    """Upgrade schema."""
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
        sa.UniqueConstraint("user_id", "normalized_name", name="uq_projects_user_normalized_name"),
    )
    op.create_index(op.f("ix_projects_created_at"), "projects", ["created_at"], unique=False)
    op.create_index(op.f("ix_projects_id"), "projects", ["id"], unique=False)
    op.create_index(op.f("ix_projects_normalized_name"), "projects", ["normalized_name"], unique=False)
    op.create_index(op.f("ix_projects_updated_at"), "projects", ["updated_at"], unique=False)
    op.create_index(op.f("ix_projects_user_id"), "projects", ["user_id"], unique=False)

    op.add_column("analyses", sa.Column("project_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_analyses_project_id"), "analyses", ["project_id"], unique=False)
    op.add_column("audit_logs", sa.Column("project_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_audit_logs_project_id"), "audit_logs", ["project_id"], unique=False)

    _backfill_projects()

    with op.batch_alter_table("analyses") as batch_op:
        batch_op.alter_column("project_id", existing_type=sa.Integer(), nullable=False)
        batch_op.create_foreign_key(
            "fk_analyses_project_id_projects",
            "projects",
            ["project_id"],
            ["id"],
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("analyses") as batch_op:
        batch_op.drop_constraint("fk_analyses_project_id_projects", type_="foreignkey")

    op.drop_index(op.f("ix_audit_logs_project_id"), table_name="audit_logs")
    op.drop_column("audit_logs", "project_id")
    op.drop_index(op.f("ix_analyses_project_id"), table_name="analyses")
    op.drop_column("analyses", "project_id")

    op.drop_index(op.f("ix_projects_user_id"), table_name="projects")
    op.drop_index(op.f("ix_projects_updated_at"), table_name="projects")
    op.drop_index(op.f("ix_projects_normalized_name"), table_name="projects")
    op.drop_index(op.f("ix_projects_id"), table_name="projects")
    op.drop_index(op.f("ix_projects_created_at"), table_name="projects")
    op.drop_table("projects")
