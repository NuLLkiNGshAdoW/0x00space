"""Associate applications with the game event they request to join."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261112_0005"
down_revision: Union[str, None] = "20261112_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("applications") as batch_op:
        batch_op.add_column(sa.Column("event_id", sa.String(), nullable=True))
        batch_op.create_foreign_key(
            "fk_applications_event_id_events",
            "events",
            ["event_id"],
            ["id"],
            ondelete="SET NULL",
        )
    op.create_index("ix_applications_event_id", "applications", ["event_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_applications_event_id", table_name="applications")
    with op.batch_alter_table("applications") as batch_op:
        batch_op.drop_constraint("fk_applications_event_id_events", type_="foreignkey")
        batch_op.drop_column("event_id")
