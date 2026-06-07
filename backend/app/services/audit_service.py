import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog

logger = logging.getLogger(__name__)


class AuditService:
    async def record_event(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        action: str,
        analysis_id: int | None = None,
        project_id: int | None = None,
        event_metadata: dict[str, Any] | None = None,
    ) -> AuditLog:
        event = AuditLog(
            user_id=user_id,
            analysis_id=analysis_id,
            project_id=project_id,
            action=action,
            event_metadata=event_metadata,
        )
        nested_transaction = None
        try:
            nested_transaction = await db.begin_nested()
            db.add(event)
            await db.flush()
            await nested_transaction.commit()
        except Exception:
            if nested_transaction is not None and nested_transaction.is_active:
                await nested_transaction.rollback()
            if event in db:
                await db.refresh(event)
                db.expunge(event)
            logger.warning(
                "Audit event commit failed action=%s user_id=%s analysis_id=%s project_id=%s",
                action,
                user_id,
                analysis_id,
                project_id,
                exc_info=True,
            )
        else:
            logger.debug(
                "Audit event committed action=%s user_id=%s analysis_id=%s project_id=%s",
                action,
                user_id,
                analysis_id,
                project_id,
            )
        return event


audit_service = AuditService()
