"""
Pydantic-схемы (DTO) — контракт между фронтендом и бэкендом.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict

from app.models import ApplicationStatus, ResourceType, GameCategory


# ---------- Applications (Заявки) ----------

class ApplicationCreate(BaseModel):
    """Данные, которые присылает форма на фронтенде."""
    nickname: str = Field(..., min_length=2, max_length=64, description="Игровой ник / имя")
    age: int = Field(..., ge=6, le=100)
    contact: str = Field(..., min_length=2, max_length=64, description="Discord или Telegram")
    game: str = Field(..., min_length=2, max_length=64, description="Minecraft / Phasmophobia / Lethal Company / другая")
    mic_or_experience_link: Optional[str] = Field(None, max_length=512)
    video_idea: str = Field(..., min_length=5, max_length=2000)


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
