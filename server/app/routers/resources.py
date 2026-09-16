"""
Эндпоинты для материалов (текстур-паки, шейдеры, моды) и сидов миров.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app import models, schemas

router = APIRouter(tags=["resources"])


@router.get("/resources", response_model=list[schemas.ResourceOut])
def list_resources(
    resource_type: Optional[models.ResourceType] = Query(
        None, description="Фильтр по типу файла: texture_pack / shader / mod / modpack / guide / other"
    ),
    game_category: Optional[models.GameCategory] = Query(
        None, description="Фильтр по игре/жанру: minecraft / coop / horror / other"
    ),
    db: Session = Depends(get_db),
):
    """Возвращает список материалов для скачивания с опциональными фильтрами."""
    query = db.query(models.Resource)
    if resource_type is not None:
        query = query.filter(models.Resource.resource_type == resource_type)
    if game_category is not None:
        query = query.filter(models.Resource.game_category == game_category)
    return query.order_by(models.Resource.created_at.desc()).all()


@router.get("/seeds", response_model=list[schemas.SeedOut])
def list_seeds(db: Session = Depends(get_db)):
    """Возвращает список интересных сидов миров."""
    return db.query(models.Seed).order_by(models.Seed.created_at.desc()).all()
