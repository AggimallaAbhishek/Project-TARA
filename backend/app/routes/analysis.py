import json
import logging
from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_async_db
from app.models.analysis import Analysis, Threat
from app.models.user import User
from app.schemas.analysis import (
    AnalysisCreate,
    AnalysisJobResponse,
    AnalysisListResponse,
    ModelReadinessResponse,
    AnalysisResponse,
    AnalysisRiskSummary,
    AnalysisSummary,
    RiskLevel,
    StrideCategory,
    VersionComparisonResponse,
)
from app.services.analysis_version_comparison_service import analysis_version_comparison_service
from app.services.audit_service import audit_service
from app.services.analysis_workflow_service import analysis_workflow_service
from app.services.auth_service import get_current_user
from app.services.analysis_job_service import analysis_job_service
from app.services.model_readiness_service import model_readiness_service
from app.services.pdf_service import pdf_report_service
from app.services.diagram_render_service import (
    DiagramRenderError,
    DiagramRendererUnavailableError,
    diagram_render_service,
)
from app.services.project_service import project_service
from app.services.rate_limit_service import analyze_rate_limiter
from app.services.risk_service import risk_service
from app.services.source_context_service import build_source_context

router = APIRouter()
logger = logging.getLogger(__name__)


def enforce_analyze_rate_limit(current_user: User = Depends(get_current_user)) -> User:
    key = f"user:{current_user.id}"
    is_allowed, retry_after = analyze_rate_limiter.is_allowed(key)
    if not is_allowed:
        logger.warning(
            "Rate limit exceeded for /api/analyze user_id=%s retry_after=%s",
            current_user.id,
            retry_after,
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Maximum 5 analyze requests per minute.",
            headers={"Retry-After": str(retry_after)},
        )
    return current_user


def _build_analysis_summary(analysis: Analysis) -> AnalysisSummary:
    high_risk_count = sum(1 for threat in analysis.threats if threat.risk_level in ["High", "Critical"])
    return AnalysisSummary(
        id=analysis.id,
        project_id=analysis.project_id,
        project=project_service.analysis_project_reference(analysis),
        title=analysis.title,
        created_at=analysis.created_at,
        total_risk_score=analysis.total_risk_score,
        threat_count=len(analysis.threats),
        high_risk_count=high_risk_count,
        analysis_time=analysis.analysis_time or 0.0,
    )


def _build_analysis_risk_summary(analysis: Analysis) -> AnalysisRiskSummary:
    threats = [
        {
            "risk_level": threat.risk_level,
            "risk_score": threat.risk_score,
            "stride_category": threat.stride_category,
        }
        for threat in analysis.threats
    ]
    summary = risk_service.get_risk_summary(threats)
    return AnalysisRiskSummary(
        analysis_id=analysis.id,
        title=analysis.title,
        **summary,
    )


async def _build_analysis_detail_response(db: AsyncSession, *, analysis: Analysis, user_id: int) -> AnalysisResponse:
    risk_summary = _build_analysis_risk_summary(analysis)
    version_comparison: VersionComparisonResponse | None = None
    try:
        version_comparison = VersionComparisonResponse.model_validate(
            await analysis_version_comparison_service.build_version_comparison(
                db,
                current_analysis=analysis,
            )
        )
    except Exception:
        logger.exception(
            "Version comparison failed during consolidated analysis detail load user_id=%s analysis_id=%s",
            user_id,
            analysis.id,
        )

    logger.debug(
        "Analysis detail loaded user_id=%s analysis_id=%s threats=%s version_comparison_included=%s",
        user_id,
        analysis.id,
        len(analysis.threats or []),
        version_comparison is not None,
    )
    return AnalysisResponse.model_validate(analysis).model_copy(
        update={
            "risk_summary": risk_summary,
            "version_comparison": version_comparison,
        }
    )


def _apply_risk_level_filter(stmt, risk_level: RiskLevel):
    if risk_level == RiskLevel.CRITICAL:
        return stmt.where(Analysis.total_risk_score >= 16)
    if risk_level == RiskLevel.HIGH:
        return stmt.where(Analysis.total_risk_score >= 10, Analysis.total_risk_score < 16)
    if risk_level == RiskLevel.MEDIUM:
        return stmt.where(Analysis.total_risk_score >= 5, Analysis.total_risk_score < 10)
    return stmt.where(Analysis.total_risk_score < 5)


async def _get_user_analysis(
    db: AsyncSession,
    *,
    analysis_id: int,
    user_id: int,
    include_threats: bool = True,
) -> Analysis | None:
    stmt = select(Analysis).options(selectinload(Analysis.project))
    if include_threats:
        stmt = stmt.options(selectinload(Analysis.threats))
    stmt = stmt.where(Analysis.id == analysis_id, Analysis.user_id == user_id)
    result = await db.execute(stmt)
    return result.scalars().first()


def _sanitize_filename(value: str) -> str:
    normalized = "".join(char if char.isalnum() or char in {"-", "_"} else "-" for char in value.strip())
    normalized = normalized.strip("-")
    return normalized[:50] or "analysis"


@router.post(
    "/analyze",
    response_model=AnalysisResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create threat analysis",
    response_description="Created analysis with generated threats",
    responses={
        401: {"description": "Authentication required"},
        429: {"description": "Analyze rate limit exceeded"},
    },
)
async def create_analysis(
    request: AnalysisCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(enforce_analyze_rate_limit),
):
    """Create a threat analysis using STRIDE methodology."""
    return await analysis_workflow_service.create_analysis(
        db=db,
        current_user=current_user,
        title=request.title,
        system_description=request.system_description,
        project_id=request.project_id,
        project_name=request.project_name,
        source="text",
        source_context=build_source_context(
            source_type="text",
            raw_or_extracted_text=request.system_description,
            source_metadata={"input_type": "text"},
        ),
        background_tasks=background_tasks,
    )


@router.post(
    "/analyze/jobs",
    response_model=AnalysisJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Queue threat analysis job",
    response_description="Queued analysis job status",
)
async def create_analysis_job(
    request: AnalysisCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(enforce_analyze_rate_limit),
):
    job = await analysis_job_service.create_job(
        db,
        user_id=current_user.id,
        source_type="text",
        payload=request.model_dump(),
    )
    background_tasks.add_task(analysis_job_service.process_job, job.job_id)
    return job


@router.get(
    "/analysis-jobs/{job_id}",
    response_model=AnalysisJobResponse,
    summary="Get analysis job status",
    response_description="Analysis job progress and completion state",
)
async def get_analysis_job(
    job_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    job = await analysis_job_service.get_user_job(db, job_id=job_id, user_id=current_user.id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis job not found.")
    return job


@router.get(
    "/model-readiness",
    response_model=ModelReadinessResponse,
    summary="Check configured Ollama model readiness",
    response_description="Text and vision model availability",
)
async def get_model_readiness(current_user: User = Depends(get_current_user)):
    _ = current_user
    return model_readiness_service.check()


@router.get(
    "/analyses",
    response_model=AnalysisListResponse,
    summary="List analyses",
    response_description="Paginated analyses matching filters",
    responses={401: {"description": "Authentication required"}},
)
async def list_analyses(
    q: str | None = Query(default=None, description="Case-insensitive search by analysis title"),
    risk_level: RiskLevel | None = Query(default=None, description="Analysis risk bucket filter"),
    stride_category: StrideCategory | None = Query(default=None, description="STRIDE category filter"),
    date_from: date | None = Query(default=None, description="Start date (inclusive), YYYY-MM-DD"),
    date_to: date | None = Query(default=None, description="End date (inclusive), YYYY-MM-DD"),
    project_id: int | None = Query(default=None, ge=1, description="Project id filter"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """List user's analyses with pagination and filters."""
    filters = [Analysis.user_id == current_user.id]

    if project_id is not None:
        try:
            await project_service.get_project_or_raise(db, project_id=project_id, user_id=current_user.id)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
        filters.append(Analysis.project_id == project_id)

    if q and q.strip():
        safe_q = q.strip().replace("%", r"\%").replace("_", r"\_")
        filters.append(Analysis.title.ilike(f"%{safe_q}%", escape="\\"))

    # Build base statement with filters
    base_stmt = select(Analysis).where(*filters)

    if risk_level:
        base_stmt = _apply_risk_level_filter(base_stmt, risk_level)

    if stride_category:
        base_stmt = base_stmt.where(Analysis.threats.any(Threat.stride_category == stride_category.value))

    if date_from:
        start_datetime = datetime.combine(date_from, time.min)
        base_stmt = base_stmt.where(Analysis.created_at >= start_datetime)

    if date_to:
        end_exclusive = datetime.combine(date_to + timedelta(days=1), time.min)
        base_stmt = base_stmt.where(Analysis.created_at < end_exclusive)

    # Count total
    count_result = await db.execute(
        select(func.count()).select_from(base_stmt.subquery())
    )
    total = count_result.scalar() or 0

    # Fetch paginated results
    result = await db.execute(
        base_stmt
        .options(selectinload(Analysis.threats))
        .options(selectinload(Analysis.project))
        .order_by(Analysis.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    analyses = list(result.scalars().all())

    items = [_build_analysis_summary(analysis) for analysis in analyses]
    has_more = (skip + len(items)) < total
    return AnalysisListResponse(items=items, total=total, skip=skip, limit=limit, has_more=has_more)


@router.get(
    "/analyses/{analysis_id}",
    response_model=AnalysisResponse,
    summary="Get analysis",
    response_description="Analysis details with threats",
    responses={401: {"description": "Authentication required"}, 404: {"description": "Analysis not found"}},
)
async def get_analysis(
    analysis_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific analysis with all threats for current user."""
    analysis = await _get_user_analysis(db, analysis_id=analysis_id, user_id=current_user.id)
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis with id {analysis_id} not found",
        )
    return await _build_analysis_detail_response(db, analysis=analysis, user_id=current_user.id)


@router.get(
    "/analyses/{analysis_id}/diagram.svg",
    summary="Render persisted UML diagram as SVG",
    response_description="Rendered SVG diagram for one analysis",
    responses={
        401: {"description": "Authentication required"},
        404: {"description": "Analysis not found or does not include UML code"},
        502: {"description": "Diagram render failed due to invalid stored UML code"},
        503: {"description": "Diagram renderer unavailable"},
    },
)
async def get_analysis_diagram_svg(
    analysis_id: int,
    refresh: bool = Query(default=False, description="Force renderer refresh and overwrite cached output"),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    analysis = await _get_user_analysis(
        db,
        analysis_id=analysis_id,
        user_id=current_user.id,
        include_threats=False,
    )
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis with id {analysis_id} not found",
        )
    if not analysis.has_diagram:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis does not include UML diagram code.",
        )

    try:
        svg_content = diagram_render_service.render_svg(
            analysis.diagram_format or "",
            analysis.diagram_code or "",
            force_refresh=refresh,
        )
    except DiagramRendererUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except DiagramRenderError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    logger.debug(
        "Diagram SVG rendered user_id=%s analysis_id=%s format=%s refresh=%s bytes=%s",
        current_user.id,
        analysis.id,
        analysis.diagram_format,
        refresh,
        len(svg_content.encode("utf-8")),
    )
    return Response(content=svg_content, media_type="image/svg+xml")


@router.get(
    "/analyses/{analysis_id}/diagram.png",
    summary="Render persisted UML diagram as PNG",
    response_description="Rendered PNG diagram for one analysis",
    responses={
        401: {"description": "Authentication required"},
        404: {"description": "Analysis not found or does not include UML code"},
        502: {"description": "Diagram render failed due to invalid stored UML code"},
        503: {"description": "Diagram renderer unavailable"},
    },
)
async def get_analysis_diagram_png(
    analysis_id: int,
    refresh: bool = Query(default=False, description="Force renderer refresh and overwrite cached output"),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    analysis = await _get_user_analysis(
        db,
        analysis_id=analysis_id,
        user_id=current_user.id,
        include_threats=False,
    )
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis with id {analysis_id} not found",
        )
    if not analysis.has_diagram:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis does not include UML diagram code.",
        )

    try:
        png_bytes = diagram_render_service.render_png(
            analysis.diagram_format or "",
            analysis.diagram_code or "",
            force_refresh=refresh,
        )
    except DiagramRendererUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except DiagramRenderError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    filename = f"{_sanitize_filename(analysis.title)}-{analysis.id}.png"
    logger.debug(
        "Diagram PNG rendered user_id=%s analysis_id=%s format=%s refresh=%s bytes=%s",
        current_user.id,
        analysis.id,
        analysis.diagram_format,
        refresh,
        len(png_bytes),
    )
    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/analyses/{analysis_id}/summary",
    response_model=AnalysisRiskSummary,
    summary="Get analysis risk summary",
    response_description="Aggregated risk and STRIDE distribution for one analysis",
    responses={401: {"description": "Authentication required"}, 404: {"description": "Analysis not found"}},
)
async def get_analysis_summary(
    analysis_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """Get risk summary for a specific analysis."""
    analysis = await _get_user_analysis(db, analysis_id=analysis_id, user_id=current_user.id)
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis with id {analysis_id} not found",
        )

    return _build_analysis_risk_summary(analysis)


@router.get(
    "/analyses/{analysis_id}/version-comparison",
    response_model=VersionComparisonResponse,
    summary="Get version comparison against previous analysis with same title",
    response_description="Resolved, unresolved, and newly introduced issues compared to previous version",
    responses={401: {"description": "Authentication required"}, 404: {"description": "Analysis not found"}},
)
async def get_analysis_version_comparison(
    analysis_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await analysis_version_comparison_service.get_version_comparison(
            db,
            analysis_id=analysis_id,
            user_id=current_user.id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )


@router.get(
    "/analyses/{analysis_id}/export.pdf",
    summary="Export analysis as PDF",
    response_description="PDF report for selected analysis",
    responses={
        200: {"content": {"application/pdf": {}}},
        401: {"description": "Authentication required"},
        404: {"description": "Analysis not found"},
    },
)
async def export_analysis_pdf(
    analysis_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """Download an analysis report as PDF."""
    analysis = await _get_user_analysis(db, analysis_id=analysis_id, user_id=current_user.id)
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis with id {analysis_id} not found",
        )

    try:
        pdf_bytes = pdf_report_service.build_analysis_pdf(analysis)
    except RuntimeError as exc:
        logger.exception("PDF generation failed for analysis_id=%s", analysis_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    await audit_service.record_event(
        db,
        user_id=current_user.id,
        action="pdf_exported",
        analysis_id=analysis.id,
        project_id=analysis.project_id,
        event_metadata={
            "analysis_id": analysis.id,
            "project_id": analysis.project_id,
            "title": analysis.title,
        },
    )
    await db.commit()

    filename = f"{_sanitize_filename(analysis.title)}-{analysis.id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete(
    "/analyses/{analysis_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete analysis",
    response_description="Analysis deleted",
    responses={401: {"description": "Authentication required"}, 404: {"description": "Analysis not found"}},
)
async def delete_analysis(
    analysis_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an analysis and related threats for current user."""
    analysis = await _get_user_analysis(db, analysis_id=analysis_id, user_id=current_user.id)
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis with id {analysis_id} not found",
        )

    await audit_service.record_event(
        db,
        user_id=current_user.id,
        action="analysis_deleted",
        analysis_id=analysis.id,
        project_id=analysis.project_id,
        event_metadata={
            "analysis_id": analysis.id,
            "project_id": analysis.project_id,
            "project_name": analysis.project.name if analysis.project else None,
            "title": analysis.title,
            "threat_count": len(analysis.threats),
            "total_risk_score": analysis.total_risk_score,
        },
    )
    await db.delete(analysis)
    await db.commit()
    return None
