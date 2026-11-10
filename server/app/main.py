"""
Точка входа FastAPI-приложения "0x00 SPACE".

Запуск локально:
    uvicorn app.main:app --reload --port 8000
"""
import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from app.config import get_settings, validate_production_security
from app.database import Base, engine, is_sqlite
from app.routers import youtube, applications, resources, backgrounds, auth, events
from app.services.monitoring import capture_exception

settings = get_settings()
validate_production_security(settings)
logger = logging.getLogger("uvicorn.error")

# Локальный SQLite остаётся удобным для разработки и тестов. Production
# PostgreSQL никогда не изменяется автоматически при старте приложения:
# схему меняет только явная команда `alembic upgrade head`.
if settings.DEBUG and is_sqlite:
    Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="Backend для сайта YouTube-канала 0x00 SPACE (Minecraft)",
    version="1.0.0",
)

# --- CORS: разрешаем обращения с фронтенда (React/Vite) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Admin-Token"],
)

# --- Роутеры ---
app.include_router(youtube.router, prefix=settings.API_PREFIX)
app.include_router(applications.router, prefix=settings.API_PREFIX)
app.include_router(resources.router, prefix=settings.API_PREFIX)
app.include_router(backgrounds.router, prefix=settings.API_PREFIX)
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(events.router, prefix=settings.API_PREFIX)
backgrounds.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/media/backgrounds", StaticFiles(directory=str(backgrounds.UPLOAD_DIR)), name="background-media")


@app.middleware("http")
async def request_logging(request: Request, call_next):
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as exc:
        capture_exception(exc, source=request.url.path)
        raise
    elapsed_ms = (time.perf_counter() - started) * 1000
    logger.info("%s %s %s %.1fms", request.method, request.url.path, response.status_code, elapsed_ms)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    if request.url.path.startswith("/media/backgrounds/"):
        # Uploaded files use an immutable random UUID name.
        response.headers.setdefault("Cache-Control", "public, max-age=31536000, immutable")
    return response


@app.get(f"{settings.API_PREFIX}/health", tags=["health"])
def health_check():
    """Healthcheck exposes service readiness without credentials or filesystem paths."""
    storage = _check_storage(backgrounds.UPLOAD_DIR)
    database = _check_database_schema()
    youtube_configured = bool(settings.YOUTUBE_API_KEY and settings.YOUTUBE_CHANNEL_ID)
    healthy = (
        storage["readable"]
        and storage["writable"]
        and database["connected"]
        and database["schema_ready"]
    )
    return {
        "status": "ok" if healthy else "degraded",
        "service": settings.APP_NAME,
        "storage": storage,
        "database": database,
        "youtube_configured": youtube_configured,
    }


def _check_database_schema(database_engine=engine):
    required_tables = {"applications", "resources", "seeds", "events"}
    try:
        with database_engine.connect() as connection:
            connection.execute(text("SELECT 1"))
            available_tables = set(inspect(connection).get_table_names())
    except Exception:
        return {"connected": False, "schema_ready": False, "missing_tables": []}

    missing_tables = sorted(required_tables - available_tables)
    return {
        "connected": True,
        "schema_ready": not missing_tables,
        "missing_tables": missing_tables,
    }


def _check_storage(directory):
    probe = directory / f".health-{uuid.uuid4().hex}"
    writable = readable = False
    try:
        directory.mkdir(parents=True, exist_ok=True)
        probe.write_bytes(b"health")
        writable = True
        readable = probe.read_bytes() == b"health"
    except OSError:
        pass
    finally:
        probe.unlink(missing_ok=True)
    return {"readable": readable, "writable": writable}
