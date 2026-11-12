"""
ORM-модели проекта 0x00 SPACE.
"""
import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Integer, Text, DateTime, Enum, Boolean, ForeignKey, Index, JSON
from sqlalchemy.orm import relationship

from app.database import Base


def gen_uuid() -> str:
    """Генерируем UUID как строку — работает одинаково и в SQLite, и в PostgreSQL."""
    return str(uuid.uuid4())


def utc_now_naive() -> datetime:
    """UTC timestamp matching the database's existing naive DateTime columns."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class ApplicationStatus(str, enum.Enum):
    """Статус рассмотрения заявки подписчика."""
    NEW = "new"
    APPROVED = "approved"
    REJECTED = "rejected"


class EventStatus(str, enum.Enum):
    PLANNED = "planned"
    REGISTRATION_OPEN = "registration_open"
    COMPLETED = "completed"


class Application(Base):
    """
    Заявка подписчика на участие в проекте/съёмках/сервере.
    """
    __tablename__ = "applications"

    id = Column(String, primary_key=True, default=gen_uuid)
    event_id = Column(String, ForeignKey("events.id", ondelete="SET NULL"), nullable=True, index=True)
    event = relationship("Event", back_populates="applications", lazy="joined")

    nickname = Column(String(64), nullable=False)           # Игровой ник / имя
    age = Column(Integer, nullable=False)                   # Возраст
    contact = Column(String(64), nullable=False)             # Discord или Telegram для связи
    game = Column(String(64), nullable=False)                 # Игра: Minecraft / Phasmophobia / Lethal Company / другая
    mic_or_experience_link = Column(String(512), nullable=True)  # Ссылка на войс-запись/пример/опыт
    video_idea = Column(Text, nullable=False)                # Идея для видео / сообщение

    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.NEW, nullable=False)
    telegram_notified = Column(Boolean, default=False)      # Успешно ли ушло уведомление в TG

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    @property
    def event_title(self) -> str | None:
        return self.event.title if self.event else None


class ResourceType(str, enum.Enum):
    """Тип загружаемого материала."""
    TEXTURE_PACK = "texture_pack"
    SHADER = "shader"
    MOD = "mod"
    MODPACK = "modpack"
    GUIDE = "guide"          # гайд/памятка (актуально для не-Minecraft игр)
    OTHER = "other"


class GameCategory(str, enum.Enum):
    """
    Игровая категория материала — канал мультиигровой, поэтому ресурсы
    группируются не только по типу файла, но и по игре/жанру.
    """
    MINECRAFT = "minecraft"
    COOP = "coop"            # кооперативные экшены (Lethal Company и т.п.)
    HORROR = "horror"        # хорроры (Phasmophobia и т.п.)
    OTHER = "other"


class Resource(Base):
    """
    Скачиваемый материал: текстур-пак, шейдер, мод, сборка или гайд.
    """
    __tablename__ = "resources"

    id = Column(String, primary_key=True, default=gen_uuid)

    title = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    resource_type = Column(Enum(ResourceType), nullable=False)
    game_category = Column(Enum(GameCategory), nullable=False, default=GameCategory.OTHER)
    game_version = Column(String(32), nullable=True)          # напр. "1.21.1", может отсутствовать
    download_url = Column(String(512), nullable=False)
    cover_image_url = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    archived_at = Column(DateTime, nullable=True, index=True)
    related_videos = relationship("ResourceVideoLink", cascade="all, delete-orphan", lazy="selectin")

    @property
    def related_video_ids(self) -> list[str]:
        return [link.video_id for link in self.related_videos]


class ResourceVideoLink(Base):
    __tablename__ = "resource_video_links"

    resource_id = Column(String, ForeignKey("resources.id", ondelete="CASCADE"), primary_key=True)
    video_id = Column(String(11), primary_key=True)
    __table_args__ = (Index("ix_resource_video_links_video_id", "video_id"),)


class Seed(Base):
    """
    Интересный сид мира.
    """
    __tablename__ = "seeds"

    id = Column(String, primary_key=True, default=gen_uuid)

    title = Column(String(128), nullable=False)
    seed_code = Column(String(64), nullable=False)            # сам сид
    coordinates = Column(String(64), nullable=True)            # напр. "X: 120, Z: -340"
    minecraft_version = Column(String(32), nullable=False)
    description = Column(Text, nullable=True)
    screenshot_url = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    archived_at = Column(DateTime, nullable=True, index=True)
    related_videos = relationship("SeedVideoLink", cascade="all, delete-orphan", lazy="selectin")

    @property
    def related_video_ids(self) -> list[str]:
        return [link.video_id for link in self.related_videos]


class SeedVideoLink(Base):
    __tablename__ = "seed_video_links"

    seed_id = Column(String, ForeignKey("seeds.id", ondelete="CASCADE"), primary_key=True)
    video_id = Column(String(11), primary_key=True)
    __table_args__ = (Index("ix_seed_video_links_video_id", "video_id"),)


class Event(Base):
    """Запланированное игровое событие, управляемое администратором."""
    __tablename__ = "events"

    id = Column(String, primary_key=True, default=gen_uuid)
    title = Column(String(160), nullable=False)
    description = Column(Text, nullable=False)
    game = Column(String(64), nullable=False)
    starts_at = Column(DateTime, nullable=False)
    image_url = Column(String(512), nullable=True)
    max_participants = Column(Integer, nullable=True)
    status = Column(Enum(EventStatus), default=EventStatus.PLANNED, nullable=False)
    registration_url = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    archived_at = Column(DateTime, nullable=True, index=True)
    applications = relationship("Application", back_populates="event")


class GameLeaderboardEntry(Base):
    """Personal best for one anonymous browser pilot in the space runner."""
    __tablename__ = "game_leaderboard"

    player_id = Column(String(36), primary_key=True)
    nickname = Column(String(24), nullable=False)
    score = Column(Integer, nullable=False, index=True)
    difficulty = Column(String(16), nullable=False)
    ship = Column(String(24), nullable=False)
    updated_at = Column(DateTime, default=utc_now_naive, nullable=False)


class AdminUser(Base):
    """Named administrator account with revocable signed sessions."""
    __tablename__ = "admin_users"

    id = Column(String, primary_key=True, default=gen_uuid)
    username = Column(String(64), nullable=False, unique=True, index=True)
    password_hash = Column(String(256), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    session_version = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=utc_now_naive, nullable=False)


class AdminAuditLog(Base):
    """Privacy-conscious log of successful administrator changes."""
    __tablename__ = "admin_audit_logs"

    id = Column(String, primary_key=True, default=gen_uuid)
    actor = Column(String(64), nullable=False)
    actor_id = Column(String, ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(64), nullable=False)
    entity_type = Column(String(64), nullable=False)
    entity_id = Column(String(64), nullable=False)
    details = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=utc_now_naive, nullable=False)

    __table_args__ = (Index("ix_admin_audit_logs_created_at", "created_at"),)
