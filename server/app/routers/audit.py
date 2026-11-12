"""Protected, paginated administrator audit history."""
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.services.admin_auth import authenticate

router = APIRouter(tags=["admin-audit"])


@router.get("/admin/audit", response_model=schemas.AdminAuditPage)
def list_admin_audit(
    request: Request,
    entity_type: str | None = Query(None, max_length=64),
    action: str | None = Query(None, max_length=64),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    authenticate(request, db)
    query = db.query(models.AdminAuditLog)
    if entity_type:
        query = query.filter(models.AdminAuditLog.entity_type == entity_type)
    if action:
        query = query.filter(models.AdminAuditLog.action == action)

    total = query.count()
    rows = (
        query.order_by(models.AdminAuditLog.created_at.desc(), models.AdminAuditLog.id.desc())
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
