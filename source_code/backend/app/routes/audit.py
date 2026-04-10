from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
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
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(AuditLog).filter(AuditLog.user_id == current_user.id)

    if action:
        query = query.filter(AuditLog.action == action)
    if analysis_id is not None:
        query = query.filter(AuditLog.analysis_id == analysis_id)

    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    return logs
