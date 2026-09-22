"""Baseline for the current 0x00 SPACE relational schema.

This revision describes the four tables currently represented by SQLAlchemy
models. It is safe to apply to a new database. Existing production databases
must be inspected first and marked with ``alembic stamp``; this revision must
not be used to recreate already existing production tables.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260922_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    application_status = sa.Enum(
        "NEW", "APPROVED", "REJECTED", name="applicationstatus"
    )
    resource_type = sa.Enum(
        "TEXTURE_PACK", "SHADER", "MOD", "MODPACK", "GUIDE", "OTHER",
        name="resourcetype",
    )
    game_category = sa.Enum("MINECRAFT", "COOP", "HORROR", "OTHER", name="gamecategory")
    event_status = sa.Enum(
        "PLANNED", "REGISTRATION_OPEN", "COMPLETED", name="eventstatus"
    )

    op.create_table(
        "applications",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("nickname", sa.String(length=64), nullable=False),
        sa.Column("age", sa.Integer(), nullable=False),
        sa.Column("contact", sa.String(length=64), nullable=False),
        sa.Column("game", sa.String(length=64), nullable=False),
        sa.Column("mic_or_experience_link", sa.String(length=512), nullable=True),
        sa.Column("video_idea", sa.Text(), nullable=False),
        sa.Column("status", application_status, nullable=False),
        sa.Column("telegram_notified", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "resources",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("title", sa.String(length=128), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("resource_type", resource_type, nullable=False),
        sa.Column("game_category", game_category, nullable=False),
        sa.Column("game_version", sa.String(length=32), nullable=True),
        sa.Column("download_url", sa.String(length=512), nullable=False),
        sa.Column("cover_image_url", sa.String(length=512), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "seeds",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("title", sa.String(length=128), nullable=False),
        sa.Column("seed_code", sa.String(length=64), nullable=False),
        sa.Column("coordinates", sa.String(length=64), nullable=True),
        sa.Column("minecraft_version", sa.String(length=32), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("screenshot_url", sa.String(length=512), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "events",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("game", sa.String(length=64), nullable=False),
        sa.Column("starts_at", sa.DateTime(), nullable=False),
        sa.Column("image_url", sa.String(length=512), nullable=True),
        sa.Column("max_participants", sa.Integer(), nullable=True),
        sa.Column("status", event_status, nullable=False),
        sa.Column("registration_url", sa.String(length=512), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    # The baseline is intentionally irreversible. Dropping production tables
    # would be destructive; development databases can be recreated explicitly.
    raise RuntimeError("The schema baseline is irreversible; do not downgrade it")
