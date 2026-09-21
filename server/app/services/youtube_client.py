"""
Клиент для YouTube Data API v3.

Логика:
1. Получаем uploads-плейлист канала (search.list не используем — он дороже по квоте).
2. Забираем последние видео из этого плейлиста через playlistItems.list.
3. Дополнительно получаем длительность видео через videos.list,
   чтобы отличить Shorts (<= 60 сек, вертикальное) от обычных видео.
4. Результат кешируем на YOUTUBE_CACHE_TTL_SECONDS, чтобы не жечь суточную квоту API.
"""
import httpx
import re
from datetime import datetime
from typing import List

from app.config import get_settings
from app.schemas import YoutubeVideoOut
from app.services.cache import cache

YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"
CACHE_KEY = "youtube:latest_videos"
VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")


class YoutubeApiError(Exception):
    """Обёртка над ошибками при обращении к YouTube API."""


def is_valid_video_id(video_id: str) -> bool:
    return bool(VIDEO_ID_RE.fullmatch(video_id))


async def fetch_video(video_id: str) -> YoutubeVideoOut | None:
    cached = cache.get(f"youtube:video:{video_id}")
    if cached is not None:
        return cached
    settings = get_settings()
    if not settings.YOUTUBE_API_KEY:
        raise YoutubeApiError("YOUTUBE_API_KEY должен быть задан в .env")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{YOUTUBE_API_BASE}/videos", params={"part": "contentDetails,snippet,statistics", "id": video_id, "key": settings.YOUTUBE_API_KEY})
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise YoutubeApiError("YouTube API временно недоступен") from exc
    try:
        items = response.json().get("items", [])
    except (TypeError, ValueError) as exc:
        raise YoutubeApiError("YouTube API вернул некорректный ответ") from exc
    if not items:
        return None
    try:
        video = items[0]
        snippet = video["snippet"]
        thumbnails = snippet["thumbnails"]
        thumbnail = thumbnails.get("high") or thumbnails["default"]
        duration = _parse_iso8601_duration_to_seconds(video["contentDetails"]["duration"])
        result = YoutubeVideoOut(video_id=video["id"], title=snippet["title"], description=snippet.get("description", ""), thumbnail_url=thumbnail["url"], published_at=datetime.fromisoformat(snippet["publishedAt"].replace("Z", "+00:00")), is_short=duration <= 60, url=f"https://www.youtube.com/watch?v={video['id']}", duration_seconds=duration, view_count=int(video.get("statistics", {}).get("viewCount", 0)))
    except (KeyError, TypeError, ValueError) as exc:
        raise YoutubeApiError("YouTube API вернул неполные данные видео") from exc
    cache.set(f"youtube:video:{video_id}", result, settings.YOUTUBE_CACHE_TTL_SECONDS)
    return result


def _parse_iso8601_duration_to_seconds(duration: str) -> int:
    """
    Разбирает ISO 8601 duration формата 'PT1M30S' в секунды.
    Простой парсер без внешних зависимостей (без isodate).
    """
    import re
    match = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration)
    if not match:
        return 0
    hours, minutes, seconds = (int(x) if x else 0 for x in match.groups())
    return hours * 3600 + minutes * 60 + seconds


async def _youtube_get(client: httpx.AsyncClient, url: str, params: dict):
    try:
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response
    except httpx.HTTPError as exc:
        raise YoutubeApiError("YouTube API временно недоступен") from exc


async def fetch_latest_videos(limit: int = 12) -> List[YoutubeVideoOut]:
    """
    Возвращает последние `limit` видео/Shorts канала, используя кеш при наличии.
    """
    cache_key = f"{CACHE_KEY}:{limit}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    settings = get_settings()
    if not settings.YOUTUBE_API_KEY or not settings.YOUTUBE_CHANNEL_ID:
        raise YoutubeApiError(
            "YOUTUBE_API_KEY и YOUTUBE_CHANNEL_ID должны быть заданы в .env"
        )

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Шаг 1: получаем ID плейлиста "uploads" канала
        channels_resp = await _youtube_get(
            client,
            f"{YOUTUBE_API_BASE}/channels",
            params={
                "part": "contentDetails",
                "id": settings.YOUTUBE_CHANNEL_ID,
                "key": settings.YOUTUBE_API_KEY,
            },
        )
        channels_data = channels_resp.json()

        items = channels_data.get("items", [])
        if not items:
            raise YoutubeApiError("Канал не найден — проверьте YOUTUBE_CHANNEL_ID")

        uploads_playlist_id = items[0]["contentDetails"]["relatedPlaylists"]["uploads"]

        # Шаг 2: последние видео из uploads-плейлиста
        playlist_resp = await _youtube_get(
            client,
            f"{YOUTUBE_API_BASE}/playlistItems",
            params={
                "part": "snippet",
                "playlistId": uploads_playlist_id,
                "maxResults": limit,
                "key": settings.YOUTUBE_API_KEY,
            },
        )
        playlist_data = playlist_resp.json()

        video_ids = [
            entry["snippet"]["resourceId"]["videoId"]
            for entry in playlist_data.get("items", [])
        ]

        if not video_ids:
            cache.set(cache_key, [], settings.YOUTUBE_CACHE_TTL_SECONDS)
            return []

        # Шаг 3: получаем длительность видео, чтобы определить Shorts
        videos_resp = await _youtube_get(
            client,
            f"{YOUTUBE_API_BASE}/videos",
            params={
                "part": "contentDetails,snippet,statistics",
                "id": ",".join(video_ids),
                "key": settings.YOUTUBE_API_KEY,
            },
        )
        videos_data = videos_resp.json()

    result: List[YoutubeVideoOut] = []
    for video in videos_data.get("items", []):
        snippet = video["snippet"]
        duration_seconds = _parse_iso8601_duration_to_seconds(
            video["contentDetails"]["duration"]
        )
        video_id = video["id"]
        view_count = int(video.get("statistics", {}).get("viewCount", 0))

        result.append(
            YoutubeVideoOut(
                video_id=video_id,
                title=snippet["title"],
                description=snippet.get("description", ""),
                thumbnail_url=snippet["thumbnails"].get("high", snippet["thumbnails"]["default"])["url"],
                published_at=datetime.fromisoformat(snippet["publishedAt"].replace("Z", "+00:00")),
                is_short=duration_seconds <= 60,
                url=f"https://www.youtube.com/watch?v={video_id}",
                duration_seconds=duration_seconds,
                view_count=view_count,
            )
        )

    # Сортируем от новых к старым на случай, если порядок из API не гарантирован
    result.sort(key=lambda v: v.published_at, reverse=True)

    cache.set(cache_key, result, settings.YOUTUBE_CACHE_TTL_SECONDS)
    return result
