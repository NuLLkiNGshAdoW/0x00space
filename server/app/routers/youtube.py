"""
Эндпоинты, связанные с YouTube.
"""
import httpx
from fastapi import APIRouter, HTTPException, Query
from redis.exceptions import RedisError

from app.schemas import YoutubeVideoOut
from app.services.cache import CacheDataError
from app.services.monitoring import capture_exception
from app.services.youtube_client import fetch_latest_videos, fetch_video, YoutubeApiError, is_valid_video_id

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
    except RedisError as exc:
        _raise_cache_unavailable(exc)
    except CacheDataError as exc:
        raise HTTPException(status_code=502, detail="Кеш YouTube содержит некорректные данные") from exc
    except (YoutubeApiError, httpx.HTTPError) as exc:
        # 502 — потому что проблема на стороне внешнего API/конфигурации, а не клиента
        raise HTTPException(status_code=502, detail="YouTube API временно недоступен") from exc


@router.get("/{video_id}")
async def get_video(video_id: str):
    if not is_valid_video_id(video_id):
        raise HTTPException(status_code=422, detail="Некорректный YouTube video ID")
    try:
        video = await fetch_video(video_id)
        if not video:
            raise HTTPException(status_code=404, detail="Видео не найдено")
        related = [item for item in await fetch_latest_videos(limit=12) if item.video_id != video_id][:3]
        return {"video": video, "related": related}
    except RedisError as exc:
        _raise_cache_unavailable(exc)
    except CacheDataError as exc:
        raise HTTPException(status_code=502, detail="Кеш YouTube содержит некорректные данные") from exc
    except (YoutubeApiError, httpx.HTTPError) as exc:
        raise HTTPException(status_code=502, detail="YouTube API временно недоступен") from exc


def _raise_cache_unavailable(error: RedisError) -> None:
    capture_exception(error, source="youtube_cache")
    raise HTTPException(status_code=503, detail="Кеш YouTube временно недоступен") from error
