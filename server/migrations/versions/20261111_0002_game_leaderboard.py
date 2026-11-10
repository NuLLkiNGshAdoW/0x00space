"""Add anonymous space-runner leaderboard."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261111_0002"
down_revision: Union[str, None] = "20260922_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "game_leaderboard",
        sa.Column("player_id", sa.String(length=36), nullable=False),
        sa.Column("nickname", sa.String(length=24), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("difficulty", sa.String(length=16), nullable=False),
        sa.Column("ship", sa.String(length=24), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("player_id"),
    )
    op.create_index("ix_game_leaderboard_score", "game_leaderboard", ["score"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_game_leaderboard_score", table_name="game_leaderboard")
    op.drop_table("game_leaderboard")
