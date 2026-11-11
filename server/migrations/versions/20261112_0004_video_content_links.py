"""Add explicit links from catalog entries to YouTube videos."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261112_0004"
down_revision: Union[str, None] = "20261112_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "resource_video_links",
        sa.Column("resource_id", sa.String(), sa.ForeignKey("resources.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("video_id", sa.String(length=11), primary_key=True),
    )
    op.create_index("ix_resource_video_links_video_id", "resource_video_links", ["video_id"])
    op.create_table(
        "seed_video_links",
        sa.Column("seed_id", sa.String(), sa.ForeignKey("seeds.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("video_id", sa.String(length=11), primary_key=True),
    )
    op.create_index("ix_seed_video_links_video_id", "seed_video_links", ["video_id"])


def downgrade() -> None:
    op.drop_index("ix_seed_video_links_video_id", table_name="seed_video_links")
    op.drop_table("seed_video_links")
    op.drop_index("ix_resource_video_links_video_id", table_name="resource_video_links")
    op.drop_table("resource_video_links")
