import logging
from typing import Any

from sqlalchemy.orm import Session

from app.models.audit import AuditLog

logger = logging.getLogger(__name__)


class AuditService:
    def record_event(
        self,
        db: Session,
        *,
        user_id: int,
        action: str,
        analysis_id: int | None = None,
        event_metadata: dict[str, Any] | None = None,
    ) -> AuditLog:
        event = AuditLog(
            user_id=user_id,
            analysis_id=analysis_id,
            action=action,
            event_metadata=event_metadata,
        )
        db.add(event)
        logger.debug(
            "Audit event queued action=%s user_id=%s analysis_id=%s",
            action,
            user_id,
            analysis_id,
        )
        return event


audit_service = AuditService()
