from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_db
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.audit import AuditLogResponse
from app.services.auth_service import get_current_user

router = APIRouter()


@router.get(
    "/audit/logs",
    response_model=list[AuditLogResponse],
    summary="List audit logs",
    response_description="Recent audit events for current user",
    responses={401: {"description": "Authentication required"}},
)
async def list_audit_logs(
    action: str | None = Query(default=None, description="Optional action filter"),
    analysis_id: int | None = Query(default=None, description="Optional analysis id filter"),
    project_id: int | None = Query(default=None, description="Optional project id filter"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(AuditLog).where(AuditLog.user_id == current_user.id)

    if action:
        stmt = stmt.where(AuditLog.action == action)
    if analysis_id is not None:
        stmt = stmt.where(AuditLog.analysis_id == analysis_id)
    if project_id is not None:
        stmt = stmt.where(AuditLog.project_id == project_id)

    stmt = stmt.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())
