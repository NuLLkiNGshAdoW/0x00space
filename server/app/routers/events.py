"""Публичные события и административное управление ими."""
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.services.admin_auth import authenticate

router = APIRouter(tags=["events"])


def _admin(request: Request, x_admin_token: str | None = Header(default=None)):
    authenticate(request, x_admin_token)


@router.get("/events", response_model=list[schemas.EventOut])
def list_events(
    game: str | None = Query(default=None),
    status: models.EventStatus | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(models.Event)
    if game:
        query = query.filter(models.Event.game == game)
    if status:
        query = query.filter(models.Event.status == status)
    return query.order_by(models.Event.starts_at.asc()).all()


@router.get("/events/{event_id}", response_model=schemas.EventOut)
def get_event(event_id: str, db: Session = Depends(get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Событие не найдено")
    return event


@router.post("/admin/events", response_model=schemas.EventOut, status_code=201)
def create_event(payload: schemas.EventCreate, request: Request, db: Session = Depends(get_db), x_admin_token: str | None = Header(default=None)):
    _admin(request, x_admin_token)
    event = models.Event(**payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.put("/admin/events/{event_id}", response_model=schemas.EventOut)
def update_event(event_id: str, payload: schemas.EventCreate, request: Request, db: Session = Depends(get_db), x_admin_token: str | None = Header(default=None)):
    _admin(request, x_admin_token)
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Событие не найдено")
    for key, value in payload.model_dump().items():
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
    db.delete(event)
    db.commit()
