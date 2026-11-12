"""
Точка входа FastAPI-приложения "0x00 SPACE".

Запуск локально:
    uvicorn app.main:app --reload --port 8000
"""
import logging
import os
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from redis.exceptions import RedisError
from sqlalchemy import inspect, text
from starlette.concurrency import run_in_threadpool

from app.config import get_settings, validate_production_security
from app.database import Base, engine, is_sqlite
from app.routers import youtube, applications, resources, backgrounds, auth, events, game, audit
from app.services import background_storage
from app.services.client_ip import get_client_ip
from app.services.monitoring import capture_exception, configure_monitoring
from app.services.rate_limit import RedisRateLimiter, create_rate_limiter

settings = get_settings()
validate_production_security(settings)
configure_monitoring(
    settings.SENTRY_DSN,
    settings.SENTRY_ENVIRONMENT,
    settings.SENTRY_RELEASE or os.getenv("RENDER_GIT_COMMIT", ""),
)
logger = logging.getLogger("uvicorn.error")
api_rate_limiter = create_rate_limiter(
    settings.RATE_LIMIT_REDIS_URL,
    settings.API_RATE_LIMIT_REQUESTS,
    settings.API_RATE_LIMIT_WINDOW_SECONDS,
    "0x00space:rate-limit:api",
)

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
    allow_headers=["Content-Type"],
)

# --- Роутеры ---
app.include_router(youtube.router, prefix=settings.API_PREFIX)
app.include_router(applications.router, prefix=settings.API_PREFIX)
app.include_router(resources.router, prefix=settings.API_PREFIX)
app.include_router(backgrounds.router, prefix=settings.API_PREFIX)
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(events.router, prefix=settings.API_PREFIX)
app.include_router(game.router, prefix=settings.API_PREFIX)
app.include_router(audit.router, prefix=settings.API_PREFIX)
backgrounds.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/media/backgrounds", StaticFiles(directory=str(backgrounds.UPLOAD_DIR)), name="background-media")


@app.middleware("http")
async def request_logging(request: Request, call_next):
    api_root = settings.API_PREFIX.rstrip("/")
    is_api_request = request.url.path == api_root or request.url.path.startswith(f"{api_root}/")
    is_health_check = request.url.path == f"{api_root}/health"
    if is_api_request and not is_health_check and request.method != "OPTIONS":
        try:
            retry_after = await run_in_threadpool(api_rate_limiter.retry_after, get_client_ip(request))
        except RedisError as exc:
            capture_exception(exc, source="rate_limit")
            return JSONResponse(
                status_code=503,
                content={"detail": "Ограничитель запросов временно недоступен."},
            )
        if retry_after is not None:
            return JSONResponse(
                status_code=429,
                content={"detail": "Слишком много запросов. Попробуйте позже."},
                headers={"Retry-After": str(retry_after)},
            )

    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as exc:
        logger.error("Unhandled application error source=http_request type=%s", type(exc).__name__)
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
    try:
        rate_limit_available = api_rate_limiter.ping()
    except RedisError as exc:
        capture_exception(exc, source="rate_limit_health")
        rate_limit_available = False
    youtube_configured = bool(settings.YOUTUBE_API_KEY and settings.YOUTUBE_CHANNEL_ID)
    healthy = (
        storage["readable"]
        and storage["writable"]
        and database["connected"]
        and database["schema_ready"]
        and rate_limit_available
    )
    return {
        "status": "ok" if healthy else "degraded",
        "service": settings.APP_NAME,
        "storage": storage,
        "database": database,
        "rate_limiter": {
            "storage": "redis" if isinstance(api_rate_limiter, RedisRateLimiter) else "memory",
            "available": rate_limit_available,
        },
        "youtube_configured": youtube_configured,
    }


def _check_database_schema(database_engine=engine):
    required_tables = {
        "applications", "resources", "seeds", "events", "game_leaderboard", "admin_audit_logs", "admin_users",
        "resource_video_links", "seed_video_links",
    }
    required_columns = {
        "applications": {"event_id"},
        "resources": {"archived_at"},
        "seeds": {"archived_at"},
        "events": {"archived_at"},
        "admin_audit_logs": {"actor", "actor_id", "action", "entity_type", "entity_id", "details", "created_at"},
    }
    try:
        with database_engine.connect() as connection:
            connection.execute(text("SELECT 1"))
            database_inspector = inspect(connection)
            available_tables = set(database_inspector.get_table_names())
            available_columns = {
                table: {item["name"] for item in database_inspector.get_columns(table)}
                for table in required_columns
                if table in available_tables
            }
    except Exception:
        return {
            "connected": False,
            "schema_ready": False,
            "missing_tables": [],
            "missing_columns": [],
        }

    missing_tables = sorted(required_tables - available_tables)
    missing_columns = sorted(
        f"{table}.{column}"
        for table, columns in required_columns.items()
        if table in available_tables
        for column in columns
        if column not in available_columns[table]
    )
    return {
        "connected": True,
        "schema_ready": not missing_tables and not missing_columns,
        "missing_tables": missing_tables,
        "missing_columns": missing_columns,
    }


def _check_storage(directory):
    if background_storage.object_storage_enabled():
        available = background_storage.check_object_storage()
        return {"readable": available, "writable": available}
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
