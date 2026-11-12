"""
Pydantic-схемы (DTO) — контракт между фронтендом и бэкендом.
"""
from datetime import datetime
import re
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import AnyHttpUrl, BaseModel, Field, ConfigDict, field_validator

from app.models import ApplicationStatus, ResourceType, GameCategory, EventStatus

YOUTUBE_VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")


def normalize_video_ids(value):
    if value is None:
        return []
    if not isinstance(value, list):
        raise ValueError("Связанные видео должны быть списком YouTube ID")
    result = []
    for item in value:
        if not isinstance(item, str):
            raise ValueError("Некорректный YouTube ID")
        video_id = item.strip()
        if not YOUTUBE_VIDEO_ID_RE.fullmatch(video_id):
            raise ValueError("YouTube ID должен содержать 11 допустимых символов")
        if video_id not in result:
            result.append(video_id)
    if len(result) > 20:
        raise ValueError("Можно связать не более 20 видео")
    return result


# ---------- Applications (Заявки) ----------

class ApplicationCreate(BaseModel):
    """Данные, которые присылает форма на фронтенде."""
    nickname: str = Field(..., min_length=2, max_length=64, description="Игровой ник / имя")
    age: int = Field(..., ge=6, le=100)
    contact: str = Field(..., min_length=2, max_length=64, description="Discord или Telegram")
    game: str = Field(..., min_length=2, max_length=64, description="Minecraft / Phasmophobia / Lethal Company / другая")
    mic_or_experience_link: Optional[str] = Field(None, max_length=512)
    video_idea: str = Field(..., min_length=5, max_length=2000)
    event_id: Optional[str] = Field(None, max_length=64)

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
    event_id: Optional[str]
    nickname: str
    age: int
    contact: str
    game: str
    mic_or_experience_link: Optional[str]
    video_idea: str
    status: ApplicationStatus
    created_at: datetime


class ApplicationAdminOut(ApplicationOut):
    telegram_notified: bool
    event_title: Optional[str] = None


class ApplicationPage(BaseModel):
    items: list[ApplicationAdminOut]
    page: int
    limit: int
    total: int
    has_next: bool


class ApplicationStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: ApplicationStatus


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
    related_video_ids: list[str] = Field(default_factory=list)
    created_at: datetime


class ResourceAdminOut(ResourceOut):
    archived_at: Optional[datetime]


class ResourceAdminPage(BaseModel):
    items: list[ResourceAdminOut]
    page: int
    limit: int
    total: int
    has_next: bool


class ResourceWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=1, max_length=128)
    description: Optional[str] = Field(None, max_length=4000)
    resource_type: ResourceType
    game_category: GameCategory = GameCategory.OTHER
    game_version: Optional[str] = Field(None, max_length=32)
    download_url: AnyHttpUrl = Field(..., max_length=512)
    cover_image_url: Optional[AnyHttpUrl] = Field(None, max_length=512)
    related_video_ids: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("related_video_ids", mode="before")
    @classmethod
    def validate_related_video_ids(cls, value):
        return normalize_video_ids(value)

    @field_validator("title", mode="before")
    @classmethod
    def normalize_title(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("description", "game_version", mode="before")
    @classmethod
    def normalize_optional_text(cls, value):
        if value is None:
            return None
        value = value.strip() if isinstance(value, str) else value
        return value or None


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
    related_video_ids: list[str] = Field(default_factory=list)
    created_at: datetime


class SeedAdminOut(SeedOut):
    archived_at: Optional[datetime]


class SeedAdminPage(BaseModel):
    items: list[SeedAdminOut]
    page: int
    limit: int
    total: int
    has_next: bool


class SeedWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=1, max_length=128)
    seed_code: str = Field(..., min_length=1, max_length=64)
    coordinates: Optional[str] = Field(None, max_length=64)
    minecraft_version: str = Field(..., min_length=1, max_length=32)
    description: Optional[str] = Field(None, max_length=4000)
    screenshot_url: Optional[AnyHttpUrl] = Field(None, max_length=512)
    related_video_ids: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("related_video_ids", mode="before")
    @classmethod
    def validate_related_video_ids(cls, value):
        return normalize_video_ids(value)

    @field_validator("title", "seed_code", "minecraft_version", mode="before")
    @classmethod
    def normalize_required_text(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("title", "seed_code", "minecraft_version")
    @classmethod
    def reject_blank_required_text(cls, value):
        if not value:
            raise ValueError("Поле не может быть пустым")
        return value

    @field_validator("coordinates", "description", mode="before")
    @classmethod
    def normalize_seed_optional_text(cls, value):
        if value is None:
            return None
        value = value.strip() if isinstance(value, str) else value
        return value or None


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
    model_config = ConfigDict(extra="forbid")

    image_url: Optional[AnyHttpUrl] = Field(None, max_length=512)
    registration_url: Optional[AnyHttpUrl] = Field(None, max_length=512)

    @field_validator("title", "description", "game", mode="before")
    @classmethod
    def normalize_event_text(cls, value):
        return value.strip() if isinstance(value, str) else value


    @field_validator("image_url", "registration_url", mode="before")
    @classmethod
    def normalize_event_urls(cls, value):
        if value is None:
            return None
        value = value.strip() if isinstance(value, str) else value
        return value or None


class EventOut(EventBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    application_count: int = 0


class EventAdminOut(EventOut):
    archived_at: Optional[datetime]


class EventAdminPage(BaseModel):
    items: list[EventAdminOut]
    page: int
    limit: int
    total: int
    has_next: bool


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


# ---------- Game leaderboard ----------

class GameScoreCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    player_id: UUID
    nickname: str = Field(..., min_length=2, max_length=24)
    score: int = Field(..., ge=0, le=10_000_000)
    difficulty: Literal["explorer", "standard", "ace", "adaptive"]
    ship: Literal["courier", "interceptor", "guardian", "seeker"]

    @field_validator("nickname", mode="before")
    @classmethod
    def normalize_nickname(cls, value):
        if not isinstance(value, str):
            return value
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Ник должен содержать минимум 2 символа")
        return value


class GameScoreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    player_id: str
    nickname: str
    score: int
    difficulty: str
    ship: str
    updated_at: datetime


# ---------- Admin audit log ----------

class AdminAuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    actor: str
    actor_id: Optional[str]
    action: str
    entity_type: str
    entity_id: str
    details: dict[str, Any]
    created_at: datetime


class AdminAuditPage(BaseModel):
    items: list[AdminAuditLogOut]
    page: int
    limit: int
    total: int
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
