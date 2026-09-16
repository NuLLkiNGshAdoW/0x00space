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

from app.config import get_settings
from app.database import Base, engine
from app.routers import youtube, applications, resources, backgrounds, auth
from app.services.monitoring import capture_exception

settings = get_settings()
logger = logging.getLogger("uvicorn.error")

# Создаём таблицы при старте, если их ещё нет.
# Для продакшена в дальнейшем стоит перейти на Alembic-миграции,
# но для MVP create_all() полностью достаточно.
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
    return response


@app.get("/api/health", tags=["health"])
def health_check():
    """Healthcheck without exposing credentials or filesystem paths."""
    storage = _check_storage(backgrounds.UPLOAD_DIR)
    youtube_configured = bool(settings.YOUTUBE_API_KEY and settings.YOUTUBE_CHANNEL_ID)
    healthy = storage["readable"] and storage["writable"]
    return {
        "status": "ok" if healthy else "degraded",
        "service": settings.APP_NAME,
        "storage": storage,
        "youtube_configured": youtube_configured,
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
