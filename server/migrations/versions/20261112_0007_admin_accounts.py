"""Add named administrator accounts and bind audit rows to their actors."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261112_0007"
down_revision: Union[str, None] = "20261112_0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "admin_users",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("username", sa.String(length=64), nullable=False),
        sa.Column("password_hash", sa.String(length=256), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("session_version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_admin_users_username", "admin_users", ["username"], unique=True)
    with op.batch_alter_table("admin_audit_logs") as batch_op:
        batch_op.add_column(sa.Column("actor_id", sa.String(), nullable=True))
        batch_op.create_foreign_key(
            "fk_admin_audit_logs_actor_id_admin_users",
            "admin_users",
            ["actor_id"],
            ["id"],
            ondelete="SET NULL",
        )
    op.create_index("ix_admin_audit_logs_actor_id", "admin_audit_logs", ["actor_id"])


def downgrade() -> None:
    op.drop_index("ix_admin_audit_logs_actor_id", table_name="admin_audit_logs")
    with op.batch_alter_table("admin_audit_logs") as batch_op:
        batch_op.drop_constraint("fk_admin_audit_logs_actor_id_admin_users", type_="foreignkey")
        batch_op.drop_column("actor_id")
    op.drop_index("ix_admin_users_username", table_name="admin_users")
    op.drop_table("admin_users")
