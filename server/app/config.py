"""
Централизованная конфигурация приложения.
Все чувствительные данные берутся из переменных окружения (.env),
никогда не хардкодятся в коде.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


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

    # Админка: задайте длинный случайный токен в server/.env.
    ADMIN_TOKEN: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    """
    Кешируем настройки, чтобы .env читался один раз за жизнь процесса.
    Используется как FastAPI Dependency: Depends(get_settings)
    """
    return Settings()
