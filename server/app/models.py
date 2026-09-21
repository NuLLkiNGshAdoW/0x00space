"""
ORM-модели проекта 0x00 SPACE.
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Integer, Text, DateTime, Enum, Boolean
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


def gen_uuid() -> str:
    """Генерируем UUID как строку — работает одинаково и в SQLite, и в PostgreSQL."""
    return str(uuid.uuid4())


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

    nickname = Column(String(64), nullable=False)           # Игровой ник / имя
    age = Column(Integer, nullable=False)                   # Возраст
    contact = Column(String(64), nullable=False)             # Discord или Telegram для связи
    game = Column(String(64), nullable=False)                 # Игра: Minecraft / Phasmophobia / Lethal Company / другая
    mic_or_experience_link = Column(String(512), nullable=True)  # Ссылка на войс-запись/пример/опыт
    video_idea = Column(Text, nullable=False)                # Идея для видео / сообщение

    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.NEW, nullable=False)
    telegram_notified = Column(Boolean, default=False)      # Успешно ли ушло уведомление в TG

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


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
