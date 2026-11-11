"""Add reversible archive timestamps to public catalog entries."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261112_0003"
down_revision: Union[str, None] = "20261111_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for table in ("resources", "seeds", "events"):
        op.add_column(table, sa.Column("archived_at", sa.DateTime(), nullable=True))
        op.create_index(f"ix_{table}_archived_at", table, ["archived_at"], unique=False)


def downgrade() -> None:
    for table in reversed(("resources", "seeds", "events")):
        op.drop_index(f"ix_{table}_archived_at", table_name=table)
        op.drop_column(table, "archived_at")
