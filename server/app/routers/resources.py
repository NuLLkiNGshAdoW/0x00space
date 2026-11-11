"""
Эндпоинты для материалов (текстур-паки, шейдеры, моды) и сидов миров.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import case, func, or_
from typing import Literal, Optional

from app.database import get_db
from app import models, schemas
from app.services.admin_auth import authenticate

router = APIRouter(tags=["resources"])


def _require_admin(request: Request, x_admin_token: str | None) -> None:
    authenticate(request, x_admin_token)


@router.get("/resources/filters")
def resource_filters(db: Session = Depends(get_db)):
    """Возвращает доступные типы и версии для фильтров каталога."""
    versions = (
        db.query(models.Resource.game_version)
        .filter(models.Resource.archived_at.is_(None))
        .filter(models.Resource.game_version.isnot(None))
        .filter(func.trim(models.Resource.game_version) != "")
        .distinct()
        .order_by(models.Resource.game_version.asc())
        .all()
    )
    return {
        "resource_types": [resource_type.value for resource_type in models.ResourceType],
        "game_versions": [version for (version,) in versions],
    }


@router.get("/resources", response_model=list[schemas.ResourceOut] | schemas.ResourcePage)
def list_resources(
    resource_type: Optional[models.ResourceType] = Query(
        None, description="Фильтр по типу файла: texture_pack / shader / mod / modpack / guide / other"
    ),
    game_category: Optional[models.GameCategory] = Query(
        None, description="Фильтр по игре/жанру: minecraft / coop / horror / other"
    ),
    game_version: Optional[str] = Query(None, max_length=32),
    search: Optional[str] = Query(None, max_length=100),
    video_id: Optional[str] = Query(None, pattern=r"^[A-Za-z0-9_-]{11}$"),
    sort: str = Query("newest", pattern="^(newest|title)$"),
    page: Optional[int] = Query(None, ge=1),
    limit: Optional[int] = Query(None, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Возвращает материалы; pagination включается при передаче page/limit.

    Ответ без page/limit остаётся legacy-массивом для совместимости старых
    клиентов. Публичный frontend всегда передаёт оба параметра.
    """
    query = db.query(models.Resource).filter(models.Resource.archived_at.is_(None))
    if video_id:
        query = query.join(models.ResourceVideoLink).filter(models.ResourceVideoLink.video_id == video_id)
    if resource_type is not None:
        query = query.filter(models.Resource.resource_type == resource_type)
    if game_category is not None:
        query = query.filter(models.Resource.game_category == game_category)
    if game_version and game_version.strip():
        query = query.filter(models.Resource.game_version == game_version.strip())
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


@router.get("/admin/resources", response_model=schemas.ResourceAdminPage)
def list_admin_resources(
    request: Request,
    search: str | None = Query(None, max_length=100),
    archive: Literal["active", "archived", "all"] = Query("active"),
    page: int = Query(1, ge=1),
    limit: int = Query(8, ge=1, le=50),
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    _require_admin(request, x_admin_token)
    query = db.query(models.Resource)
    if archive == "active":
        query = query.filter(models.Resource.archived_at.is_(None))
    elif archive == "archived":
        query = query.filter(models.Resource.archived_at.is_not(None))
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.Resource.title.ilike(term),
                models.Resource.description.ilike(term),
                models.Resource.game_version.ilike(term),
            )
        )
    total = query.count()
    rows = (
        query.order_by(
            case((models.Resource.archived_at.is_(None), 0), else_=1),
            models.Resource.created_at.desc(),
            models.Resource.id.asc(),
        )
        .offset((page - 1) * limit)
        .limit(limit + 1)
        .all()
    )
    return {
        "items": rows[:limit],
        "page": page,
        "limit": limit,
        "total": total,
        "has_next": len(rows) > limit,
    }


@router.post("/admin/resources", response_model=schemas.ResourceOut, status_code=201)
def create_resource(
    payload: schemas.ResourceWrite,
    request: Request,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    _require_admin(request, x_admin_token)
    values = payload.model_dump()
    related_video_ids = values.pop("related_video_ids", [])
    values["download_url"] = str(values["download_url"])
    values["cover_image_url"] = str(values["cover_image_url"]) if values["cover_image_url"] else None
    resource = models.Resource(
        **values,
        related_videos=[models.ResourceVideoLink(video_id=video_id) for video_id in related_video_ids],
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource


@router.put("/admin/resources/{resource_id}", response_model=schemas.ResourceOut)
def update_resource(
    resource_id: str,
    payload: schemas.ResourceWrite,
    request: Request,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    _require_admin(request, x_admin_token)
    resource = db.get(models.Resource, resource_id)
    if resource is None:
        raise HTTPException(status_code=404, detail="Материал не найден")
    values = payload.model_dump()
    related_video_ids = values.pop("related_video_ids", [])
    values["download_url"] = str(values["download_url"])
    values["cover_image_url"] = str(values["cover_image_url"]) if values["cover_image_url"] else None
    for field, value in values.items():
        setattr(resource, field, value)
    existing_links = {link.video_id: link for link in resource.related_videos}
    resource.related_videos = [
        existing_links.get(video_id) or models.ResourceVideoLink(video_id=video_id)
        for video_id in related_video_ids
    ]
    db.commit()
    db.refresh(resource)
    return resource


@router.delete("/admin/resources/{resource_id}", status_code=204)
def delete_resource(
    resource_id: str,
    request: Request,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    _require_admin(request, x_admin_token)
    resource = db.get(models.Resource, resource_id)
    if resource is None:
        raise HTTPException(status_code=404, detail="Материал не найден")
    resource.archived_at = resource.archived_at or datetime.utcnow()
    db.commit()


@router.post("/admin/resources/{resource_id}/restore", response_model=schemas.ResourceAdminOut)
def restore_resource(
    resource_id: str,
    request: Request,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    _require_admin(request, x_admin_token)
    resource = db.get(models.Resource, resource_id)
    if resource is None:
        raise HTTPException(status_code=404, detail="Материал не найден")
    resource.archived_at = None
    db.commit()
    db.refresh(resource)
    return resource


@router.get("/seeds", response_model=list[schemas.SeedOut] | schemas.SeedPage)
def list_seeds(
    search: Optional[str] = Query(None, max_length=100),
    video_id: Optional[str] = Query(None, pattern=r"^[A-Za-z0-9_-]{11}$"),
    sort: str = Query("newest", pattern="^(newest|title)$"),
    page: Optional[int] = Query(None, ge=1),
    limit: Optional[int] = Query(None, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Возвращает сиды; pagination включается при передаче page/limit."""
    query = db.query(models.Seed).filter(models.Seed.archived_at.is_(None))
    if video_id:
        query = query.join(models.SeedVideoLink).filter(models.SeedVideoLink.video_id == video_id)
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


@router.get("/admin/seeds", response_model=schemas.SeedAdminPage)
def list_admin_seeds(
    request: Request,
    search: str | None = Query(None, max_length=100),
    archive: Literal["active", "archived", "all"] = Query("active"),
    page: int = Query(1, ge=1),
    limit: int = Query(8, ge=1, le=50),
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    _require_admin(request, x_admin_token)
    query = db.query(models.Seed)
    if archive == "active":
        query = query.filter(models.Seed.archived_at.is_(None))
    elif archive == "archived":
        query = query.filter(models.Seed.archived_at.is_not(None))
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.Seed.title.ilike(term),
                models.Seed.seed_code.ilike(term),
                models.Seed.minecraft_version.ilike(term),
                models.Seed.description.ilike(term),
            )
        )
    total = query.count()
    rows = (
        query.order_by(
            case((models.Seed.archived_at.is_(None), 0), else_=1),
            models.Seed.created_at.desc(),
            models.Seed.id.asc(),
        )
        .offset((page - 1) * limit)
        .limit(limit + 1)
        .all()
    )
    return {
        "items": rows[:limit],
        "page": page,
        "limit": limit,
        "total": total,
        "has_next": len(rows) > limit,
    }


@router.post("/admin/seeds", response_model=schemas.SeedOut, status_code=201)
def create_seed(
    payload: schemas.SeedWrite,
    request: Request,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    _require_admin(request, x_admin_token)
    values = payload.model_dump()
    related_video_ids = values.pop("related_video_ids", [])
    values["screenshot_url"] = str(values["screenshot_url"]) if values["screenshot_url"] else None
    seed = models.Seed(
        **values,
        related_videos=[models.SeedVideoLink(video_id=video_id) for video_id in related_video_ids],
    )
    db.add(seed)
    db.commit()
    db.refresh(seed)
    return seed


@router.put("/admin/seeds/{seed_id}", response_model=schemas.SeedOut)
def update_seed(
    seed_id: str,
    payload: schemas.SeedWrite,
    request: Request,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    _require_admin(request, x_admin_token)
    seed = db.get(models.Seed, seed_id)
    if seed is None:
        raise HTTPException(status_code=404, detail="Сид не найден")
    values = payload.model_dump()
    related_video_ids = values.pop("related_video_ids", [])
    values["screenshot_url"] = str(values["screenshot_url"]) if values["screenshot_url"] else None
    for field, value in values.items():
        setattr(seed, field, value)
    existing_links = {link.video_id: link for link in seed.related_videos}
    seed.related_videos = [
        existing_links.get(video_id) or models.SeedVideoLink(video_id=video_id)
        for video_id in related_video_ids
    ]
    db.commit()
    db.refresh(seed)
    return seed


@router.delete("/admin/seeds/{seed_id}", status_code=204)
def delete_seed(
    seed_id: str,
    request: Request,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    _require_admin(request, x_admin_token)
    seed = db.get(models.Seed, seed_id)
    if seed is None:
        raise HTTPException(status_code=404, detail="Сид не найден")
    seed.archived_at = seed.archived_at or datetime.utcnow()
    db.commit()


@router.post("/admin/seeds/{seed_id}/restore", response_model=schemas.SeedAdminOut)
def restore_seed(
    seed_id: str,
    request: Request,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    _require_admin(request, x_admin_token)
    seed = db.get(models.Seed, seed_id)
    if seed is None:
        raise HTTPException(status_code=404, detail="Сид не найден")
    seed.archived_at = None
    db.commit()
    db.refresh(seed)
    return seed
