"""
Pydantic-схемы (DTO) — контракт между фронтендом и бэкендом.
"""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, ConfigDict, field_validator

from app.models import ApplicationStatus, ResourceType, GameCategory, EventStatus


# ---------- Applications (Заявки) ----------

class ApplicationCreate(BaseModel):
    """Данные, которые присылает форма на фронтенде."""
    nickname: str = Field(..., min_length=2, max_length=64, description="Игровой ник / имя")
    age: int = Field(..., ge=6, le=100)
    contact: str = Field(..., min_length=2, max_length=64, description="Discord или Telegram")
    game: str = Field(..., min_length=2, max_length=64, description="Minecraft / Phasmophobia / Lethal Company / другая")
    mic_or_experience_link: Optional[str] = Field(None, max_length=512)
    video_idea: str = Field(..., min_length=5, max_length=2000)

    @field_validator("nickname", "contact", "game", "video_idea", mode="before")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        if not isinstance(value, str):
            return value
        value = value.strip()
        if not value:
            raise ValueError("Поле не может быть пустым")
        return value

    @field_validator("mic_or_experience_link", mode="before")
    @classmethod
    def normalize_optional_link(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class ApplicationOut(BaseModel):
    """Что возвращаем клиенту после успешного сохранения."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    nickname: str
    age: int
    contact: str
    game: str
    mic_or_experience_link: Optional[str]
    video_idea: str
    status: ApplicationStatus
    created_at: datetime


# ---------- Resources (Материалы) ----------

class ResourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: Optional[str]
    resource_type: ResourceType
    game_category: GameCategory
    game_version: Optional[str]
    download_url: str
    cover_image_url: Optional[str]
    created_at: datetime


class ResourcePage(BaseModel):
    items: list[ResourceOut]
    page: int
    limit: int
    has_next: bool


# ---------- Seeds (Сиды) ----------

class SeedOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    seed_code: str
    coordinates: Optional[str]
    minecraft_version: str
    description: Optional[str]
    screenshot_url: Optional[str]
    created_at: datetime


class SeedPage(BaseModel):
    items: list[SeedOut]
    page: int
    limit: int
    has_next: bool


# ---------- Events (Ивенты) ----------

class EventBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=160)
    description: str = Field(..., min_length=2, max_length=4000)
    game: str = Field(..., min_length=2, max_length=64)
    starts_at: datetime
    image_url: Optional[str] = Field(None, max_length=512)
    max_participants: Optional[int] = Field(None, ge=1, le=10000)
    status: EventStatus = EventStatus.PLANNED
    registration_url: Optional[str] = Field(None, max_length=512)


class EventCreate(EventBase):
    pass


class EventOut(EventBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime


# ---------- Background settings ----------

class BackgroundSettings(BaseModel):
    shade: float = Field(..., ge=0, le=0.72)
    blur: float = Field(..., ge=0, le=20)
    position: Literal["center", "top", "bottom"]
    speed: float = Field(..., ge=0.25, le=2)
    rotation_minutes: int = Field(..., ge=0, le=1440)


class BackgroundSettingsUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    shade: Optional[float] = Field(None, ge=0, le=0.72)
    blur: Optional[float] = Field(None, ge=0, le=20)
    position: Optional[Literal["center", "top", "bottom"]] = None
    speed: Optional[float] = Field(None, ge=0.25, le=2)
    rotation_minutes: Optional[int] = Field(None, ge=0, le=1440)

    @field_validator("shade", "blur", "position", "speed", "rotation_minutes", mode="before")
    @classmethod
    def reject_null_values(cls, value):
        if value is None:
            raise ValueError("Значение не может быть null")
        return value


class EventPage(BaseModel):
    items: list[EventOut]
    page: int
    limit: int
    has_next: bool


# ---------- YouTube ----------

class YoutubeVideoOut(BaseModel):
    """Нормализованные данные видео/Shorts для карточек на фронте."""
    video_id: str
    title: str
    description: str
    thumbnail_url: str
    published_at: datetime
    is_short: bool
    url: str
    duration_seconds: int
    view_count: int


class YoutubeVideoDetailOut(BaseModel):
    video: YoutubeVideoOut
    related: list[YoutubeVideoOut]
