"""
Эндпоинты для материалов (текстур-паки, шейдеры, моды) и сидов миров.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional

from app.database import get_db
from app import models, schemas

router = APIRouter(tags=["resources"])


@router.get("/resources", response_model=list[schemas.ResourceOut] | schemas.ResourcePage)
def list_resources(
    resource_type: Optional[models.ResourceType] = Query(
        None, description="Фильтр по типу файла: texture_pack / shader / mod / modpack / guide / other"
    ),
    game_category: Optional[models.GameCategory] = Query(
        None, description="Фильтр по игре/жанру: minecraft / coop / horror / other"
    ),
    search: Optional[str] = Query(None, max_length=100),
    sort: str = Query("newest", pattern="^(newest|title)$"),
    page: Optional[int] = Query(None, ge=1),
    limit: Optional[int] = Query(None, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Возвращает материалы; pagination включается при передаче page/limit.

    Ответ без page/limit остаётся legacy-массивом для совместимости старых
    клиентов. Публичный frontend всегда передаёт оба параметра.
    """
    query = db.query(models.Resource)
    if resource_type is not None:
        query = query.filter(models.Resource.resource_type == resource_type)
    if game_category is not None:
        query = query.filter(models.Resource.game_category == game_category)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.Resource.title.ilike(term),
                models.Resource.description.ilike(term),
                models.Resource.game_version.ilike(term),
            )
        )
    if sort == "title":
        query = query.order_by(models.Resource.title.asc(), models.Resource.id.asc())
    else:
        query = query.order_by(models.Resource.created_at.desc(), models.Resource.id.desc())
    if page is None and limit is None:
        return query.all()
    current_page = page or 1
    current_limit = limit or 12
    rows = query.offset((current_page - 1) * current_limit).limit(current_limit + 1).all()
    return {
        "items": rows[:current_limit],
        "page": current_page,
        "limit": current_limit,
        "has_next": len(rows) > current_limit,
    }


@router.get("/seeds", response_model=list[schemas.SeedOut] | schemas.SeedPage)
def list_seeds(
    search: Optional[str] = Query(None, max_length=100),
    sort: str = Query("newest", pattern="^(newest|title)$"),
    page: Optional[int] = Query(None, ge=1),
    limit: Optional[int] = Query(None, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Возвращает сиды; pagination включается при передаче page/limit."""
    query = db.query(models.Seed)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.Seed.title.ilike(term),
                models.Seed.seed_code.ilike(term),
                models.Seed.coordinates.ilike(term),
                models.Seed.minecraft_version.ilike(term),
                models.Seed.description.ilike(term),
            )
        )
    if sort == "title":
        query = query.order_by(models.Seed.title.asc(), models.Seed.id.asc())
    else:
        query = query.order_by(models.Seed.created_at.desc(), models.Seed.id.desc())
    if page is None and limit is None:
        return query.all()
    current_page = page or 1
    current_limit = limit or 12
    rows = query.offset((current_page - 1) * current_limit).limit(current_limit + 1).all()
    return {
        "items": rows[:current_limit],
        "page": current_page,
        "limit": current_limit,
        "has_next": len(rows) > current_limit,
    }
