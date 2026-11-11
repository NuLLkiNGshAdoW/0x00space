"""
Эндпоинты для заявок на участие.
"""
from collections import defaultdict, deque
from time import monotonic

from fastapi import APIRouter, Depends, BackgroundTasks, Header, HTTPException, Query, Request
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app import models, schemas
from app.services.client_ip import get_client_ip
from app.services.telegram import notify_new_application
from app.services.admin_auth import authenticate

router = APIRouter(prefix="/applications", tags=["applications"])

# Простая защита MVP от случайного/автоматического спама. Для нескольких
# production-инстансов этот лимит следует перенести в Redis или reverse-proxy.
_request_log: dict[str, deque[float]] = defaultdict(deque)
_RATE_WINDOW_SECONDS = 3600
_RATE_LIMIT = 5


def _check_rate_limit(request: Request) -> None:
    client_key = get_client_ip(request)
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

    event = None
    if payload.event_id:
        event = (
            db.query(models.Event)
            .filter(models.Event.id == payload.event_id, models.Event.archived_at.is_(None))
            .with_for_update()
            .first()
        )
        if event is None or event.status != models.EventStatus.REGISTRATION_OPEN:
            raise HTTPException(status_code=409, detail="Регистрация на это событие недоступна")
        active_applications = (
            db.query(func.count(models.Application.id))
            .filter(
                models.Application.event_id == event.id,
                models.Application.status != models.ApplicationStatus.REJECTED,
            )
            .scalar()
        )
        if event.max_participants is not None and active_applications >= event.max_participants:
            raise HTTPException(status_code=409, detail="Все места на это событие заняты")

    application = models.Application(
        event_id=event.id if event else None,
        nickname=payload.nickname,
        age=payload.age,
        contact=payload.contact,
        game=event.game if event else payload.game,
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


@router.get("/admin", response_model=schemas.ApplicationPage)
def list_admin_applications(
    request: Request,
    search: str | None = Query(None, max_length=100),
    status: models.ApplicationStatus | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    x_admin_token: str | None = Header(default=None),
):
    authenticate(request, x_admin_token)
    query = db.query(models.Application)
    if status is not None:
        query = query.filter(models.Application.status == status)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.outerjoin(models.Event).filter(or_(
            models.Application.nickname.ilike(term),
            models.Application.contact.ilike(term),
            models.Application.game.ilike(term),
            models.Application.video_idea.ilike(term),
            models.Event.title.ilike(term),
        ))
    total = query.count()
    rows = (
        query.order_by(models.Application.created_at.desc(), models.Application.id.desc())
        .offset((page - 1) * limit)
        .limit(limit + 1)
        .all()
    )
    return {"items": rows[:limit], "page": page, "limit": limit, "total": total, "has_next": len(rows) > limit}


@router.patch("/admin/{application_id}/status", response_model=schemas.ApplicationOut)
def update_application_status(
    application_id: str,
    payload: schemas.ApplicationStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    x_admin_token: str | None = Header(default=None),
):
    authenticate(request, x_admin_token)
    application = db.get(models.Application, application_id)
    if application is None:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    application.status = payload.status
    db.commit()
    db.refresh(application)
    return application
