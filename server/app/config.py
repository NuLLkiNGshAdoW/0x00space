"""
Централизованная конфигурация приложения.
Все чувствительные данные берутся из переменных окружения (.env),
никогда не хардкодятся в коде.
"""
from functools import lru_cache
from urllib.parse import urlparse
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


def is_production(settings: "Settings") -> bool:
    """Render production uses non-debug PostgreSQL; local SQLite stays simple."""
    return not settings.DEBUG and settings.DATABASE_URL.startswith(("postgresql", "postgres"))


def validate_production_security(settings: "Settings") -> None:
    if is_production(settings) and not settings.ADMIN_SESSION_SECRET:
        raise RuntimeError("ADMIN_SESSION_SECRET is required in production")


class Settings(BaseSettings):
    # --- Общие настройки приложения ---
    APP_NAME: str = "0x00 SPACE API"
    DEBUG: bool = False
    API_PREFIX: str = "/api"

    # --- База данных ---
    # Для локальной разработки по умолчанию используется SQLite,
    # в проде через .env подставляется строка подключения к PostgreSQL:
    # postgresql+psycopg2://user:password@db:5432/zerox00space
    DATABASE_URL: str = "sqlite:///./local.db"

    # --- CORS ---
    # Список origin'ов, которым разрешено обращаться к API (React dev-сервер, прод-домен)
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # --- YouTube Data API v3 ---
    YOUTUBE_API_KEY: str = ""
    YOUTUBE_CHANNEL_ID: str = ""  # ID канала @0x00space (не путать с handle)
    YOUTUBE_CACHE_TTL_SECONDS: int = 900  # 15 минут — чтобы не жечь квоту YouTube API

    # --- Telegram Bot API ---
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_ADMIN_CHAT_ID: str = ""  # ID чата/канала админа, куда падают заявки

    # Админка: задайте пароль в server/.env. ADMIN_TOKEN сохранён для обратной совместимости.
    ADMIN_PASSWORD: str = ""
    ADMIN_TOKEN: str = ""  # Deprecated legacy header authentication.
    ADMIN_SESSION_SECRET: str = ""  # Separate secret; never derive from password/token.
    ADMIN_SESSION_TTL_SECONDS: int = 1800
    ADMIN_LOGIN_MAX_FAILURES: int = 5
    ADMIN_LOGIN_WINDOW_SECONDS: int = 900
    COOKIE_SECURE: bool = False
    SENTRY_DSN: str = ""

    # Файловое хранилище фоновых изображений/видео. Путь может быть абсолютным
    # или относительным к рабочему каталогу backend.
    BACKGROUND_UPLOAD_DIR: str = "uploads/backgrounds"
    # Необязательный URL каталога, если файлы раздаются CDN/object storage.
    BACKGROUND_PUBLIC_BASE_URL: str = ""

    @field_validator("BACKGROUND_PUBLIC_BASE_URL")
    @classmethod
    def validate_background_public_url(cls, value: str) -> str:
        if not value:
            return value
        parsed = urlparse(value.rstrip("/"))
        if (
            parsed.scheme != "https"
            or not parsed.netloc
            or parsed.username
            or parsed.password
            or parsed.query
            or parsed.fragment
        ):
            raise ValueError("BACKGROUND_PUBLIC_BASE_URL must be an HTTPS URL without credentials")
        if len(value) > 2048:
            raise ValueError("BACKGROUND_PUBLIC_BASE_URL is too long")
        return value.rstrip("/")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    """
    Кешируем настройки, чтобы .env читался один раз за жизнь процесса.
    Используется как FastAPI Dependency: Depends(get_settings)
    """
    return Settings()
