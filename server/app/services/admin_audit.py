"""Helpers for recording administrator changes without copying submitted data."""
from typing import Any

from sqlalchemy.orm import Session

from app import models


def record_admin_action(
    db: Session,
    *,
    action: str,
    entity_type: str,
    entity_id: str,
    actor_id: str,
    actor: str,
    details: dict[str, Any] | None = None,
) -> None:
    db.add(
        models.AdminAuditLog(
            actor=actor,
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details or {},
        )
    )
