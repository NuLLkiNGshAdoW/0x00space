"""
Эндпоинты для заявок на участие.
"""
from collections import defaultdict, deque
from time import monotonic

from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app import models, schemas
from app.services.telegram import notify_new_application

router = APIRouter(prefix="/applications", tags=["applications"])

# Простая защита MVP от случайного/автоматического спама. Для нескольких
# production-инстансов этот лимит следует перенести в Redis или reverse-proxy.
_request_log: dict[str, deque[float]] = defaultdict(deque)
_RATE_WINDOW_SECONDS = 3600
_RATE_LIMIT = 5


def _check_rate_limit(request: Request) -> None:
    client_key = request.client.host if request.client else "unknown"
    now = monotonic()
    recent = _request_log[client_key]
    while recent and now - recent[0] > _RATE_WINDOW_SECONDS:
        recent.popleft()
    if len(recent) >= _RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Слишком много заявок. Попробуйте снова позже.",
            headers={"Retry-After": str(_RATE_WINDOW_SECONDS)},
        )
    recent.append(now)


async def _send_telegram_and_update_flag(application_id: str):
    """
    Фоновая задача: отправляет уведомление в Telegram и обновляет флаг
    telegram_notified в БД. Вынесено отдельно, чтобы не задерживать
    ответ клиенту ожиданием ответа от Telegram API.

    Важно: открывает СВОЮ сессию БД (SessionLocal), а не переиспользует
    сессию из запроса — та закрывается сразу после отправки ответа клиенту,
    и к моменту выполнения фоновой задачи уже недействительна.
    """
    db = SessionLocal()
    try:
        application = db.query(models.Application).filter(
            models.Application.id == application_id
        ).first()
        if application is None:
            return

        success = await notify_new_application(application)
        application.telegram_notified = success
        db.commit()
    finally:
        db.close()


@router.post("", response_model=schemas.ApplicationOut, status_code=201)
def create_application(
    request: Request,
    payload: schemas.ApplicationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Принимает заявку подписчика, сохраняет в БД и асинхронно
    уведомляет администратора в Telegram (не блокируя ответ клиенту).
    """
    _check_rate_limit(request)

    application = models.Application(
        nickname=payload.nickname,
        age=payload.age,
        contact=payload.contact,
        game=payload.game,
        mic_or_experience_link=payload.mic_or_experience_link,
        video_idea=payload.video_idea,
    )

    db.add(application)
    db.commit()
    db.refresh(application)

    # Уведомление в Telegram отправляем в фоне — заявка уже сохранена,
    # и пользователь не должен ждать сетевого запроса к Telegram.
    background_tasks.add_task(_send_telegram_and_update_flag, application.id)

    return application
