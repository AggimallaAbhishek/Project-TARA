import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.comparison import ComparisonRequest, ComparisonResponse
from app.services.auth_service import get_current_user
from app.services.comparison_service import comparison_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post(
    "/compare",
    response_model=ComparisonResponse,
    summary="Compare analyses",
    response_description="Side-by-side comparison of selected analyses",
    responses={
        401: {"description": "Authentication required"},
        400: {"description": "Invalid comparison request"},
        404: {"description": "One or more analyses not found"},
    },
)
async def compare_analyses(
    request: ComparisonRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Compare threats across multiple analyses side-by-side."""
    if len(set(request.analysis_ids)) != len(request.analysis_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate analysis IDs are not allowed",
        )

    try:
        result = comparison_service.compare_analyses(
            db,
            analysis_ids=request.analysis_ids,
            user_id=current_user.id,
        )
        return result
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    except Exception:
        logger.exception("Comparison failed for analysis_ids=%s", request.analysis_ids)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Comparison failed due to an internal error",
        )
