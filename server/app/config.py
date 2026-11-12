"""
Централизованная конфигурация приложения.
Все чувствительные данные берутся из переменных окружения (.env),
никогда не хардкодятся в коде.
"""
from functools import lru_cache
from urllib.parse import urlparse
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator, model_validator


def is_production(settings: "Settings") -> bool:
    """Render production uses non-debug PostgreSQL; local SQLite stays simple."""
    return not settings.DEBUG and settings.DATABASE_URL.startswith(("postgresql", "postgres"))


def validate_production_security(settings: "Settings") -> None:
    if is_production(settings):
        if not settings.ADMIN_SESSION_SECRET:
            raise RuntimeError("ADMIN_SESSION_SECRET is required in production")
        if not settings.RATE_LIMIT_REDIS_URL:
            raise RuntimeError("RATE_LIMIT_REDIS_URL is required in production")


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

    # Separate signing secret for authenticated administrator sessions.
    ADMIN_SESSION_SECRET: str = ""
    ADMIN_SESSION_TTL_SECONDS: int = 1800
    ADMIN_LOGIN_MAX_FAILURES: int = 5
    ADMIN_LOGIN_WINDOW_SECONDS: int = 900
    COOKIE_SECURE: bool = False
    SENTRY_DSN: str = ""
    SENTRY_ENVIRONMENT: str = "development"
    SENTRY_RELEASE: str = ""

    # Behind Render/Cloudflare request.client.host is the proxy address. Set
    # this to a proxy-provided header (for example "cf-connecting-ip") so
    # rate limits and admin login lockout use the real client IP.
    TRUSTED_CLIENT_IP_HEADER: str = ""
    API_RATE_LIMIT_REQUESTS: int = Field(default=120, gt=0)
    API_RATE_LIMIT_WINDOW_SECONDS: int = Field(default=60, gt=0)
    RATE_LIMIT_REDIS_URL: str = ""

    # Файловое хранилище фоновых изображений/видео. Путь может быть абсолютным
    # или относительным к рабочему каталогу backend.
    BACKGROUND_UPLOAD_DIR: str = "uploads/backgrounds"
    # Необязательный URL каталога, если файлы раздаются CDN/object storage.
    BACKGROUND_PUBLIC_BASE_URL: str = ""
    BACKGROUND_STORAGE_BACKEND: str = "local"
    BACKGROUND_S3_ENDPOINT_URL: str = ""
    BACKGROUND_S3_BUCKET: str = ""
    BACKGROUND_S3_ACCESS_KEY_ID: str = ""
    BACKGROUND_S3_SECRET_ACCESS_KEY: str = ""
    BACKGROUND_S3_REGION: str = "auto"

    @field_validator("RATE_LIMIT_REDIS_URL")
    @classmethod
    def validate_rate_limit_redis_url(cls, value: str) -> str:
        if not value:
            return value
        parsed = urlparse(value)
        if parsed.scheme not in {"redis", "rediss"} or not parsed.hostname:
            raise ValueError("RATE_LIMIT_REDIS_URL must be a redis:// or rediss:// URL")
        return value

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

    @field_validator("BACKGROUND_S3_ENDPOINT_URL")
    @classmethod
    def validate_background_s3_endpoint(cls, value: str) -> str:
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
            raise ValueError("BACKGROUND_S3_ENDPOINT_URL must be an HTTPS URL without credentials")
        return value.rstrip("/")

    @model_validator(mode="after")
    def validate_background_storage(self):
        if self.BACKGROUND_STORAGE_BACKEND not in {"local", "s3"}:
            raise ValueError("BACKGROUND_STORAGE_BACKEND must be 'local' or 's3'")
        if self.BACKGROUND_STORAGE_BACKEND == "s3":
            required = {
                "BACKGROUND_S3_ENDPOINT_URL": self.BACKGROUND_S3_ENDPOINT_URL,
                "BACKGROUND_S3_BUCKET": self.BACKGROUND_S3_BUCKET,
                "BACKGROUND_S3_ACCESS_KEY_ID": self.BACKGROUND_S3_ACCESS_KEY_ID,
                "BACKGROUND_S3_SECRET_ACCESS_KEY": self.BACKGROUND_S3_SECRET_ACCESS_KEY,
                "BACKGROUND_PUBLIC_BASE_URL": self.BACKGROUND_PUBLIC_BASE_URL,
            }
            missing = [key for key, value in required.items() if not value]
            if missing:
                raise ValueError(f"S3 background storage requires: {', '.join(missing)}")
        return self

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    """
    Кешируем настройки, чтобы .env читался один раз за жизнь процесса.
    Используется как FastAPI Dependency: Depends(get_settings)
    """
    return Settings()
