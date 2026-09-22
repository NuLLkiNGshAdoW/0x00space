"""
Отправка уведомлений администратору в Telegram через Bot API.

Используем простой HTTP-запрос к api.telegram.org/bot<TOKEN>/sendMessage —
для одного уведомления это проще и надёжнее, чем тянуть тяжёлую библиотеку
python-telegram-bot.
"""
import httpx
import logging
from html import escape

from app.config import get_settings
from app.models import Application

logger = logging.getLogger(__name__)

TELEGRAM_API_BASE = "https://api.telegram.org"


def _telegram_value(value: object) -> str:
    """Escape only user-controlled values, keeping app-owned HTML tags intact."""
    return escape(str(value), quote=False)


def _build_message_text(application: Application) -> str:
    """Формируем читаемый текст уведомления с HTML-разметкой Telegram."""
    mic_line = (
        f"🎙 Микрофон/опыт: {_telegram_value(application.mic_or_experience_link)}\n"
        if application.mic_or_experience_link
        else ""
    )
    return (
        "🆕 <b>Новая заявка на участие — 0x00 SPACE</b>\n\n"
        f"👤 Ник: <b>{_telegram_value(application.nickname)}</b>\n"
        f"🎂 Возраст: {_telegram_value(application.age)}\n"
        f"🎮 Игра: {_telegram_value(application.game)}\n"
        f"💬 Контакт: {_telegram_value(application.contact)}\n"
        f"{mic_line}"
        f"💡 Идея для видео:\n{_telegram_value(application.video_idea)}"
    )


async def notify_new_application(application: Application) -> bool:
    """
    Отправляет уведомление о новой заявке в Telegram.
    Возвращает True при успехе, False при ошибке (не бросает исключение,
    чтобы не ронять основной запрос сохранения заявки из-за проблем с Telegram).
    """
    settings = get_settings()

    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_ADMIN_CHAT_ID:
        logger.warning("Telegram не настроен (нет TELEGRAM_BOT_TOKEN/TELEGRAM_ADMIN_CHAT_ID) — уведомление пропущено")
        return False

    url = f"{TELEGRAM_API_BASE}/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": settings.TELEGRAM_ADMIN_CHAT_ID,
        "text": _build_message_text(application),
        "parse_mode": "HTML",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
        return True
    except httpx.HTTPError as exc:
        logger.error("Не удалось отправить уведомление в Telegram: %s", exc)
        return False
