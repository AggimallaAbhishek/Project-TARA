import asyncio
import logging
from time import perf_counter

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.user import User
from app.schemas.analysis import AnalysisResponse
from app.schemas.diagram import DiagramAnalyzeRequest, DiagramExtractResponse, DiagramSourceMetadata
from app.services.analysis_workflow_service import analysis_workflow_service
from app.services.auth_service import get_current_user
from app.services.diagram_extract_service import DiagramExtractionError, diagram_extract_service
from app.services.extract_session_service import extract_session_service
from app.services.rate_limit_service import diagram_analyze_rate_limiter, diagram_extract_rate_limiter

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


def enforce_diagram_extract_rate_limit(current_user: User = Depends(get_current_user)) -> User:
    key = f"user:{current_user.id}"
    is_allowed, retry_after = diagram_extract_rate_limiter.is_allowed(key)
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Maximum 10 extraction requests per minute.",
            headers={"Retry-After": str(retry_after)},
        )
    return current_user


def enforce_diagram_analyze_rate_limit(current_user: User = Depends(get_current_user)) -> User:
    key = f"user:{current_user.id}"
    is_allowed, retry_after = diagram_analyze_rate_limiter.is_allowed(key)
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Maximum 5 diagram analyze requests per minute.",
            headers={"Retry-After": str(retry_after)},
        )
    return current_user


@router.post(
    "/diagram/extract",
    response_model=DiagramExtractResponse,
    summary="Extract architecture text from a diagram file",
    response_description="Extraction session identifier and editable architecture text",
    responses={
        400: {"description": "Invalid or unsupported file"},
        401: {"description": "Authentication required"},
        413: {"description": "Uploaded file too large"},
        429: {"description": "Extraction rate limit exceeded"},
    },
)
async def extract_diagram(
    file: UploadFile = File(...),
    current_user: User = Depends(enforce_diagram_extract_rate_limit),
):
    request_start = perf_counter()
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A filename is required for diagram extraction.",
        )

    raw_bytes = await file.read()
    max_bytes = settings.diagram_max_upload_mb * 1024 * 1024
    if len(raw_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"File is too large. Maximum allowed size is {settings.diagram_max_upload_mb} MB.",
        )

    try:
        extracted_description, source_metadata = await diagram_extract_service.extract_from_upload(
            file_name=file.filename,
            content_type=file.content_type,
            file_bytes=raw_bytes,
        )
        extract_id = extract_session_service.create_session(
            user_id=current_user.id,
            extracted_system_description=extracted_description,
            source_metadata=source_metadata,
        )
        elapsed = perf_counter() - request_start
        logger.info(
            "Diagram extracted user_id=%s extract_id=%s input_type=%s size_bytes=%s elapsed=%.2fs",
            current_user.id,
            extract_id,
            source_metadata.get("input_type"),
            source_metadata.get("file_size"),
            elapsed,
        )
        return DiagramExtractResponse(
            extract_id=extract_id,
            extracted_system_description=extracted_description,
            source_metadata=DiagramSourceMetadata.model_validate(source_metadata),
        )
    except DiagramExtractionError as exc:
        logger.warning(
            "Diagram extraction rejected user_id=%s file_name=%s error=%s",
            current_user.id,
            file.filename,
            str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except asyncio.TimeoutError:
        logger.warning(
            "Diagram extraction timed out user_id=%s file_name=%s",
            current_user.id,
            file.filename,
        )
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Diagram extraction timed out. Try a smaller file or a simpler diagram.",
        )
    except RuntimeError as exc:
        logger.warning(
            "Diagram extraction runtime error user_id=%s file_name=%s error=%s",
            current_user.id,
            file.filename,
            str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )
    except Exception:
        logger.exception(
            "Unexpected diagram extraction failure user_id=%s file_name=%s",
            current_user.id,
            file.filename,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Diagram extraction failed due to an internal server error.",
        )


@router.post(
    "/diagram/analyze",
    response_model=AnalysisResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Analyze extracted diagram architecture",
    response_description="Created analysis with generated threats",
    responses={
        401: {"description": "Authentication required"},
        404: {"description": "Extract session not found or expired"},
        429: {"description": "Analyze rate limit exceeded"},
    },
)
async def analyze_diagram(
    request: DiagramAnalyzeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(enforce_diagram_analyze_rate_limit),
):
    session_payload = extract_session_service.get_session(
        extract_id=request.extract_id,
        user_id=current_user.id,
    )
    if not session_payload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diagram extraction session not found or expired.",
        )

    system_description = (
        request.system_description
        if request.system_description is not None
        else session_payload.get("extracted_system_description", "")
    ).strip()
    if len(system_description) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="system_description must be at least 10 characters.",
        )

    analysis = await analysis_workflow_service.create_analysis(
        db=db,
        current_user=current_user,
        title=request.title,
        system_description=system_description,
        background_tasks=background_tasks,
    )
    extract_session_service.delete_session(request.extract_id)
    return analysis
