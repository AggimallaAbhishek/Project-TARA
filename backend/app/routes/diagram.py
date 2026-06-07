import asyncio
import logging
from time import perf_counter

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_async_db
from app.models.user import User
from app.schemas.analysis import AnalysisJobResponse, AnalysisResponse
from app.schemas.diagram import (
    DiagramAnalyzeRequest,
    DiagramCodeAnalyzeRequest,
    DiagramExtractResponse,
    DiagramSourceMetadata,
)
from app.services.analysis_workflow_service import analysis_workflow_service
from app.services.analysis_job_service import analysis_job_service
from app.services.auth_service import get_current_user
from app.services.diagram_extract_service import DiagramExtractionError, diagram_extract_service
from app.services.extract_session_service import extract_session_service
from app.services.rate_limit_service import diagram_analyze_rate_limiter, diagram_extract_rate_limiter
from app.services.source_context_service import build_source_context

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


def _diagram_source_type(source_metadata: dict) -> str:
    input_type = str(source_metadata.get("input_type") or "file").strip().lower()
    return f"diagram_{input_type}"


def _decode_text_diagram_payload(file_bytes: bytes) -> str:
    try:
        return file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            return file_bytes.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise DiagramExtractionError("Text UML diagram files must be UTF-8 encoded.") from exc


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
        diagram_format = None
        diagram_code = None
        input_type = source_metadata.get("input_type")
        if input_type in {"mermaid", "plantuml"}:
            diagram_code = _decode_text_diagram_payload(raw_bytes).strip()
            if diagram_code:
                diagram_format = input_type

        extract_id = extract_session_service.create_session(
            user_id=current_user.id,
            extracted_system_description=extracted_description,
            source_metadata=source_metadata,
            diagram_format=diagram_format,
            diagram_code=diagram_code,
        )
        elapsed = perf_counter() - request_start
        logger.info(
            "Diagram extracted user_id=%s extract_id=%s input_type=%s size_bytes=%s diagram_format=%s diagram_code_length=%s elapsed=%.2fs",
            current_user.id,
            extract_id,
            source_metadata.get("input_type"),
            source_metadata.get("file_size"),
            diagram_format,
            len(diagram_code or ""),
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
    db: AsyncSession = Depends(get_async_db),
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
        project_id=request.project_id,
        project_name=request.project_name,
        diagram_format=session_payload.get("diagram_format"),
        diagram_code=session_payload.get("diagram_code"),
        source="diagram",
        source_context=build_source_context(
            source_type=_diagram_source_type(session_payload.get("source_metadata") or {}),
            raw_or_extracted_text=system_description,
            source_metadata=session_payload.get("source_metadata") or {},
            structured_context=(session_payload.get("source_metadata") or {}).get("structured_context"),
            editable_summary=(session_payload.get("source_metadata") or {}).get("editable_summary") or system_description,
        ),
        background_tasks=background_tasks,
    )
    extract_session_service.delete_session(request.extract_id)
    return analysis


@router.post(
    "/diagram/analyze/jobs",
    response_model=AnalysisJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Queue extracted diagram architecture analysis",
    response_description="Queued diagram analysis job",
)
async def analyze_diagram_job(
    request: DiagramAnalyzeRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db),
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
    job = await analysis_job_service.create_job(
        db,
        user_id=current_user.id,
        source_type="diagram",
        payload=request.model_dump(),
    )
    background_tasks.add_task(analysis_job_service.process_job, job.job_id)
    return job


@router.post(
    "/diagram/analyze-code",
    response_model=AnalysisResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Analyze Mermaid or PlantUML code",
    response_description="Created analysis with generated threats from UML code",
    responses={
        400: {"description": "Invalid UML format or UML code"},
        401: {"description": "Authentication required"},
        429: {"description": "Analyze rate limit exceeded"},
    },
)
async def analyze_diagram_code(
    request: DiagramCodeAnalyzeRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(enforce_diagram_analyze_rate_limit),
):
    try:
        extracted_description = diagram_extract_service.extract_from_uml_code(
            uml_format=request.uml_format,
            uml_code=request.uml_code,
        )
    except DiagramExtractionError as exc:
        logger.warning(
            "UML code extraction rejected user_id=%s format=%s error=%s",
            current_user.id,
            request.uml_format,
            str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    analysis = await analysis_workflow_service.create_analysis(
        db=db,
        current_user=current_user,
        title=request.title,
        system_description=extracted_description,
        project_id=request.project_id,
        project_name=request.project_name,
        diagram_format=request.uml_format,
        diagram_code=request.uml_code,
        source="uml_code",
        source_context=build_source_context(
            source_type=f"uml_{request.uml_format}",
            raw_or_extracted_text=extracted_description,
            source_metadata={
                "input_type": request.uml_format,
                "extractor_used": f"{request.uml_format}_parser_v1",
                "code_length": len(request.uml_code),
            },
        ),
        background_tasks=background_tasks,
    )
    return analysis


@router.post(
    "/diagram/analyze-code/jobs",
    response_model=AnalysisJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Queue Mermaid or PlantUML code analysis",
    response_description="Queued UML code analysis job",
)
async def analyze_diagram_code_job(
    request: DiagramCodeAnalyzeRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(enforce_diagram_analyze_rate_limit),
):
    try:
        diagram_extract_service.extract_from_uml_code(
            uml_format=request.uml_format,
            uml_code=request.uml_code,
        )
    except DiagramExtractionError as exc:
        logger.warning(
            "UML code extraction rejected user_id=%s format=%s error=%s",
            current_user.id,
            request.uml_format,
            str(exc),
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    job = await analysis_job_service.create_job(
        db,
        user_id=current_user.id,
        source_type="uml",
        payload=request.model_dump(),
    )
    background_tasks.add_task(analysis_job_service.process_job, job.job_id)
    return job
