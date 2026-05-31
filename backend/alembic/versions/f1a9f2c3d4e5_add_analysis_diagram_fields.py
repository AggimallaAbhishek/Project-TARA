"""add_analysis_diagram_fields

Revision ID: f1a9f2c3d4e5
Revises: 9f4a2c1b7d30
Create Date: 2026-05-31 10:30:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f1a9f2c3d4e5"
down_revision: Union[str, Sequence[str], None] = "9f4a2c1b7d30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DIAGRAM_FIELDS_CONSISTENCY_CK = "ck_analyses_diagram_fields_consistent"
DIAGRAM_FORMAT_VALID_CK = "ck_analyses_diagram_format_valid"


def _table_exists(inspector: sa.Inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()


def _column_exists(inspector: sa.Inspector, table_name: str, column_name: str) -> bool:
    return any(column.get("name") == column_name for column in inspector.get_columns(table_name))


def _check_constraint_exists(
    inspector: sa.Inspector,
    table_name: str,
    constraint_name: str,
) -> bool:
    return any(
        constraint.get("name") == constraint_name
        for constraint in inspector.get_check_constraints(table_name)
    )


def _refresh_inspector() -> sa.Inspector:
    return sa.inspect(op.get_bind())


def upgrade() -> None:
    inspector = _refresh_inspector()
    if not _table_exists(inspector, "analyses"):
        return

    if not _column_exists(inspector, "analyses", "diagram_format"):
        op.add_column("analyses", sa.Column("diagram_format", sa.String(length=32), nullable=True))
    if not _column_exists(inspector, "analyses", "diagram_code"):
        op.add_column("analyses", sa.Column("diagram_code", sa.Text(), nullable=True))

    inspector = _refresh_inspector()
    needs_consistency_ck = not _check_constraint_exists(
        inspector,
        "analyses",
        DIAGRAM_FIELDS_CONSISTENCY_CK,
    )
    needs_format_ck = not _check_constraint_exists(
        inspector,
        "analyses",
        DIAGRAM_FORMAT_VALID_CK,
    )

    if needs_consistency_ck or needs_format_ck:
        with op.batch_alter_table("analyses") as batch_op:
            if needs_consistency_ck:
                batch_op.create_check_constraint(
                    DIAGRAM_FIELDS_CONSISTENCY_CK,
                    "((diagram_format IS NULL AND diagram_code IS NULL) OR "
                    "(diagram_format IS NOT NULL AND diagram_code IS NOT NULL))",
                )
            if needs_format_ck:
                batch_op.create_check_constraint(
                    DIAGRAM_FORMAT_VALID_CK,
                    "(diagram_format IS NULL OR diagram_format IN ('mermaid', 'plantuml'))",
                )


def downgrade() -> None:
    inspector = _refresh_inspector()
    if not _table_exists(inspector, "analyses"):
        return

    has_consistency_ck = _check_constraint_exists(
        inspector,
        "analyses",
        DIAGRAM_FIELDS_CONSISTENCY_CK,
    )
    has_format_ck = _check_constraint_exists(
        inspector,
        "analyses",
        DIAGRAM_FORMAT_VALID_CK,
    )

    if has_consistency_ck or has_format_ck:
        with op.batch_alter_table("analyses") as batch_op:
            if has_format_ck:
                batch_op.drop_constraint(DIAGRAM_FORMAT_VALID_CK, type_="check")
            if has_consistency_ck:
                batch_op.drop_constraint(DIAGRAM_FIELDS_CONSISTENCY_CK, type_="check")

    inspector = _refresh_inspector()
    if _column_exists(inspector, "analyses", "diagram_code"):
        op.drop_column("analyses", "diagram_code")
    if _column_exists(inspector, "analyses", "diagram_format"):
        op.drop_column("analyses", "diagram_format")
