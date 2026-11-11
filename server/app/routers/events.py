"""Публичные события и административное управление ими."""
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from sqlalchemy import case, func, or_
from sqlalchemy.orm import Session
from typing import Literal

from app import models, schemas
from app.database import get_db
from app.services.admin_auth import authenticate

router = APIRouter(tags=["events"])


def _admin(request: Request, x_admin_token: str | None = Header(default=None)):
    authenticate(request, x_admin_token)


def _event_values(payload: schemas.EventCreate):
    values = payload.model_dump()
    values["image_url"] = str(values["image_url"]) if values["image_url"] else None
    values["registration_url"] = str(values["registration_url"]) if values["registration_url"] else None
    return values


def _attach_application_counts(db: Session, events: list[models.Event]) -> list[models.Event]:
    if not events:
        return events
    event_ids = [event.id for event in events]
    counts = dict(
        db.query(models.Application.event_id, func.count(models.Application.id))
        .filter(
            models.Application.event_id.in_(event_ids),
            models.Application.status != models.ApplicationStatus.REJECTED,
        )
        .group_by(models.Application.event_id)
        .all()
    )
    for event in events:
        event.application_count = counts.get(event.id, 0)
    return events


@router.get("/events", response_model=list[schemas.EventOut] | schemas.EventPage)
def list_events(
    game: str | None = Query(default=None),
    status: models.EventStatus | None = Query(default=None),
    page: int | None = Query(default=None, ge=1),
    limit: int | None = Query(default=None, ge=1, le=50),
    db: Session = Depends(get_db),
):
    query = db.query(models.Event).filter(models.Event.archived_at.is_(None))
    if game:
        query = query.filter(models.Event.game == game)
    if status:
        query = query.filter(models.Event.status == status)
    query = query.order_by(models.Event.starts_at.asc(), models.Event.id.asc())
    if page is None and limit is None:
        return _attach_application_counts(db, query.all())
    current_page = page or 1
    current_limit = limit or 12
    rows = query.offset((current_page - 1) * current_limit).limit(current_limit + 1).all()
    _attach_application_counts(db, rows[:current_limit])
    return {
        "items": rows[:current_limit],
        "page": current_page,
        "limit": current_limit,
        "has_next": len(rows) > current_limit,
    }


@router.get("/events/games", response_model=list[str])
def list_event_games(db: Session = Depends(get_db)):
    """Return all games that have events, independent of the current filters."""
    rows = (
        db.query(models.Event.game)
        .filter(models.Event.archived_at.is_(None))
        .distinct()
        .order_by(models.Event.game.asc())
        .all()
    )
    return [row[0] for row in rows]


@router.get("/events/{event_id}", response_model=schemas.EventOut)
def get_event(event_id: str, db: Session = Depends(get_db)):
    event = (
        db.query(models.Event)
        .filter(models.Event.id == event_id, models.Event.archived_at.is_(None))
        .first()
    )
    if event is None:
        raise HTTPException(status_code=404, detail="Событие не найдено")
    _attach_application_counts(db, [event])
    return event


@router.post("/admin/events", response_model=schemas.EventOut, status_code=201)
def create_event(payload: schemas.EventCreate, request: Request, db: Session = Depends(get_db), x_admin_token: str | None = Header(default=None)):
    _admin(request, x_admin_token)
    event = models.Event(**_event_values(payload))
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/admin/events", response_model=schemas.EventAdminPage)
def list_admin_events(
    request: Request,
    search: str | None = Query(None, max_length=100),
    archive: Literal["active", "archived", "all"] = Query("active"),
    page: int = Query(1, ge=1),
    limit: int = Query(8, ge=1, le=50),
    db: Session = Depends(get_db),
    x_admin_token: str | None = Header(default=None),
):
    _admin(request, x_admin_token)
    query = db.query(models.Event)
    if archive == "active":
        query = query.filter(models.Event.archived_at.is_(None))
    elif archive == "archived":
        query = query.filter(models.Event.archived_at.is_not(None))
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.Event.title.ilike(term),
                models.Event.description.ilike(term),
                models.Event.game.ilike(term),
            )
        )
    total = query.count()
    rows = (
        query.order_by(
            case((models.Event.archived_at.is_(None), 0), else_=1),
            models.Event.starts_at.asc(),
            models.Event.id.asc(),
        )
        .offset((page - 1) * limit)
        .limit(limit + 1)
        .all()
    )
    _attach_application_counts(db, rows[:limit])
    return {
        "items": rows[:limit],
        "page": page,
        "limit": limit,
        "total": total,
        "has_next": len(rows) > limit,
    }


@router.put("/admin/events/{event_id}", response_model=schemas.EventOut)
def update_event(event_id: str, payload: schemas.EventCreate, request: Request, db: Session = Depends(get_db), x_admin_token: str | None = Header(default=None)):
    _admin(request, x_admin_token)
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Событие не найдено")
    for key, value in _event_values(payload).items():
        setattr(event, key, value)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/admin/events/{event_id}", status_code=204)
def delete_event(event_id: str, request: Request, db: Session = Depends(get_db), x_admin_token: str | None = Header(default=None)):
    _admin(request, x_admin_token)
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Событие не найдено")
    event.archived_at = event.archived_at or datetime.utcnow()
    db.commit()


@router.post("/admin/events/{event_id}/restore", response_model=schemas.EventAdminOut)
def restore_event(
    event_id: str,
    request: Request,
    db: Session = Depends(get_db),
    x_admin_token: str | None = Header(default=None),
):
    _admin(request, x_admin_token)
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Событие не найдено")
    event.archived_at = None
    db.commit()
    db.refresh(event)
    return event
