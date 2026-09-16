"""
Эндпоинты, связанные с YouTube.
"""
from fastapi import APIRouter, HTTPException, Query

from app.schemas import YoutubeVideoOut
from app.services.youtube_client import fetch_latest_videos, YoutubeApiError

router = APIRouter(prefix="/youtube", tags=["youtube"])


@router.get("/latest", response_model=list[YoutubeVideoOut])
async def get_latest_videos(
    limit: int = Query(12, ge=1, le=50, description="Сколько последних видео вернуть"),
):
    """
    Возвращает последние видео/Shorts канала.
    Результат кешируется на сервере (см. YOUTUBE_CACHE_TTL_SECONDS в .env),
    чтобы не превышать квоту YouTube Data API.
    """
    try:
        return await fetch_latest_videos(limit=limit)
    except YoutubeApiError as exc:
        # 502 — потому что проблема на стороне внешнего API/конфигурации, а не клиента
        raise HTTPException(status_code=502, detail=str(exc))
