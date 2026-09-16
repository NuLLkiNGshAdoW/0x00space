"""
Точка входа FastAPI-приложения "0x00 SPACE".

Запуск локально:
    uvicorn app.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import Base, engine
from app.routers import youtube, applications, resources, backgrounds

settings = get_settings()

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
app.mount("/media", StaticFiles(directory="uploads"), name="media")


@app.get("/api/health", tags=["health"])
def health_check():
    """Простой healthcheck — удобно для Docker/Nginx/мониторинга."""
    return {"status": "ok", "service": settings.APP_NAME}
