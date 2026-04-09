import logging
from time import perf_counter

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.user import User
from app.schemas.analysis import AnalysisCreate, DocumentAnalysisResponse
from app.services.analysis_version_comparison_service import analysis_version_comparison_service
from app.services.analysis_workflow_service import analysis_workflow_service
from app.services.auth_service import get_current_user
from app.services.document_extract_service import DocumentExtractionError, document_extract_service
from app.services.rate_limit_service import document_analyze_rate_limiter

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


def enforce_document_analyze_rate_limit(current_user: User = Depends(get_current_user)) -> User:
    key = f"user:{current_user.id}"
    is_allowed, retry_after = document_analyze_rate_limiter.is_allowed(key)
    if not is_allowed:
        logger.warning(
            "Rate limit exceeded for /api/document/analyze user_id=%s retry_after=%s",
            current_user.id,
            retry_after,
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Maximum 5 document analyze requests per minute.",
            headers={"Retry-After": str(retry_after)},
        )
    return current_user


@router.post(
    "/document/analyze",
    response_model=DocumentAnalysisResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Analyze uploaded document and generate version comparison",
    response_description="Created analysis with computed version-comparison report",
    responses={
        400: {"description": "Invalid upload payload"},
        401: {"description": "Authentication required"},
        413: {"description": "Uploaded file too large"},
        429: {"description": "Rate limit exceeded"},
    },
)
async def analyze_document(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(enforce_document_analyze_rate_limit),
):
    request_start = perf_counter()
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A filename is required for document analysis.",
        )

    file_bytes = await file.read()
    max_bytes = settings.document_max_upload_mb * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"File is too large. Maximum allowed size is {settings.document_max_upload_mb} MB.",
        )

    try:
        extracted_description, source_metadata = await document_extract_service.extract_from_upload(
            file_name=file.filename,
            content_type=file.content_type,
            file_bytes=file_bytes,
        )
        validated_request = AnalysisCreate(
            title=title,
            system_description=extracted_description,
        )
        analysis = await analysis_workflow_service.create_analysis(
            db=db,
            current_user=current_user,
            title=validated_request.title,
            system_description=validated_request.system_description,
            background_tasks=background_tasks,
        )
        version_comparison = analysis_version_comparison_service.get_version_comparison(
            db,
            analysis_id=analysis.id,
            user_id=current_user.id,
        )
        elapsed = perf_counter() - request_start
        logger.info(
            "Document analysis complete user_id=%s analysis_id=%s input_type=%s size_bytes=%s pages=%s elapsed=%.2fs",
            current_user.id,
            analysis.id,
            source_metadata.get("input_type"),
            source_metadata.get("file_size"),
            source_metadata.get("pages_processed"),
            elapsed,
        )
        return DocumentAnalysisResponse(
            analysis=analysis,
            version_comparison=version_comparison,
        )
    except ValidationError as exc:
        detail = "Invalid title or extracted document text."
        if exc.errors():
            first_error = exc.errors()[0]
            message = first_error.get("msg")
            if isinstance(message, str) and message.strip():
                detail = message.strip()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
    except DocumentExtractionError as exc:
        logger.warning(
            "Document extraction rejected user_id=%s file_name=%s error=%s",
            current_user.id,
            file.filename,
            str(exc),
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except RuntimeError as exc:
        logger.warning(
            "Document extraction runtime error user_id=%s file_name=%s error=%s",
            current_user.id,
            file.filename,
            str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception(
            "Unexpected document analyze failure user_id=%s file_name=%s",
            current_user.id,
            file.filename,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Document analysis failed due to an internal server error.",
        )
