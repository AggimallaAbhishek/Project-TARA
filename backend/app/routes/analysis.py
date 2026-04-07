import logging
from datetime import date, datetime, time, timedelta
from time import perf_counter

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models.analysis import Analysis, Threat
from app.models.user import User
from app.schemas.analysis import (
    AnalysisCreate,
    AnalysisListResponse,
    AnalysisResponse,
    AnalysisRiskSummary,
    AnalysisSummary,
    RiskLevel,
    StrideCategory,
)
from app.services.audit_service import audit_service
from app.services.auth_service import get_current_user
from app.services.email_service import email_service
from app.services.llm_service import llm_service
from app.services.pdf_service import pdf_report_service
from app.services.rate_limit_service import analyze_rate_limiter
from app.services.risk_service import risk_service

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
        title=analysis.title,
        created_at=analysis.created_at,
        total_risk_score=analysis.total_risk_score,
        threat_count=len(analysis.threats),
        high_risk_count=high_risk_count,
        analysis_time=analysis.analysis_time or 0.0,
    )


def _apply_risk_level_filter(query, risk_level: RiskLevel):
    if risk_level == RiskLevel.CRITICAL:
        return query.filter(Analysis.total_risk_score >= 16)
    if risk_level == RiskLevel.HIGH:
        return query.filter(Analysis.total_risk_score >= 10, Analysis.total_risk_score < 16)
    if risk_level == RiskLevel.MEDIUM:
        return query.filter(Analysis.total_risk_score >= 5, Analysis.total_risk_score < 10)
    return query.filter(Analysis.total_risk_score < 5)


def _get_user_analysis(
    db: Session,
    *,
    analysis_id: int,
    user_id: int,
    include_threats: bool = True,
) -> Analysis | None:
    query = db.query(Analysis)
    if include_threats:
        query = query.options(selectinload(Analysis.threats))
    return query.filter(Analysis.id == analysis_id, Analysis.user_id == user_id).first()


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
    db: Session = Depends(get_db),
    current_user: User = Depends(enforce_analyze_rate_limit),
):
    """Create a threat analysis using STRIDE methodology."""
    request_start = perf_counter()
    try:
        threat_data, analysis_time = await llm_service.analyze_system(request.system_description)

        analysis = Analysis(
            user_id=current_user.id,
            title=request.title,
            system_description=request.system_description,
            analysis_time=analysis_time,
        )
        db.add(analysis)
        db.flush()

        threats: list[Threat] = []
        for threat_item in threat_data:
            required_keys = {
                "name",
                "description",
                "stride_category",
                "affected_component",
                "likelihood",
                "impact",
                "mitigation",
            }
            if not required_keys.issubset(threat_item):
                continue

            risk_score = risk_service.calculate_risk_score(
                threat_item["likelihood"],
                threat_item["impact"],
            )
            calculated_risk_level = risk_service.get_risk_level_from_score(risk_score)

            threat = Threat(
                analysis_id=analysis.id,
                name=threat_item["name"],
                description=threat_item["description"],
                stride_category=threat_item["stride_category"],
                affected_component=threat_item["affected_component"],
                risk_level=calculated_risk_level,
                likelihood=threat_item["likelihood"],
                impact=threat_item["impact"],
                risk_score=risk_score,
                mitigation=threat_item["mitigation"],
            )
            db.add(threat)
            threats.append(threat)

        if not threats:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Analysis failed: No valid threats could be generated",
            )

        threat_dicts = [{"risk_score": threat.risk_score} for threat in threats]
        analysis.total_risk_score = risk_service.calculate_total_risk_score(threat_dicts)

        audit_service.record_event(
            db,
            user_id=current_user.id,
            action="analysis_created",
            analysis_id=analysis.id,
            event_metadata={
                "title": analysis.title,
                "threat_count": len(threats),
                "total_risk_score": analysis.total_risk_score,
            },
        )

        db.commit()
        db.refresh(analysis)
        total_elapsed = perf_counter() - request_start
        logger.info(
            "Analysis created user_id=%s analysis_id=%s threats=%s llm_time=%.2fs total=%.2fs",
            current_user.id,
            analysis.id,
            len(threats),
            analysis_time,
            total_elapsed,
        )

        # Send email notification in the background
        risk_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
        for t in threats:
            if t.risk_level in risk_counts:
                risk_counts[t.risk_level] += 1
        overall_risk = risk_service.get_risk_level_from_score(analysis.total_risk_score)
        background_tasks.add_task(
            email_service.send_analysis_complete,
            user_email=current_user.email,
            user_name=current_user.name,
            analysis_id=analysis.id,
            analysis_title=analysis.title,
            total_risk_score=analysis.total_risk_score,
            threat_count=len(threats),
            risk_level=overall_risk,
            critical_count=risk_counts["Critical"],
            high_count=risk_counts["High"],
            medium_count=risk_counts["Medium"],
            low_count=risk_counts["Low"],
        )

        return analysis

    except HTTPException:
        db.rollback()
        raise
    except RuntimeError as exc:
        db.rollback()
        logger.warning(
            "Analysis runtime error user_id=%s elapsed=%.2fs error=%s",
            current_user.id,
            perf_counter() - request_start,
            str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Analysis failed: {str(exc)}",
        )
    except Exception:
        db.rollback()
        logger.exception(
            "Unexpected error while creating analysis user_id=%s elapsed=%.2fs",
            current_user.id,
            perf_counter() - request_start,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Analysis failed due to an internal server error",
        )


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
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List user's analyses with pagination and filters."""
    query = db.query(Analysis).filter(Analysis.user_id == current_user.id)

    if q and q.strip():
        safe_q = q.strip().replace("%", r"\%").replace("_", r"\_")
        query = query.filter(Analysis.title.ilike(f"%{safe_q}%", escape="\\"))

    if risk_level:
        query = _apply_risk_level_filter(query, risk_level)

    if stride_category:
        query = query.filter(Analysis.threats.any(Threat.stride_category == stride_category.value))

    if date_from:
        start_datetime = datetime.combine(date_from, time.min)
        query = query.filter(Analysis.created_at >= start_datetime)

    if date_to:
        end_exclusive = datetime.combine(date_to + timedelta(days=1), time.min)
        query = query.filter(Analysis.created_at < end_exclusive)

    total = query.count()
    analyses = (
        query.options(selectinload(Analysis.threats))
        .order_by(Analysis.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific analysis with all threats for current user."""
    analysis = _get_user_analysis(db, analysis_id=analysis_id, user_id=current_user.id)
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis with id {analysis_id} not found",
        )
    return analysis


@router.get(
    "/analyses/{analysis_id}/summary",
    response_model=AnalysisRiskSummary,
    summary="Get analysis risk summary",
    response_description="Aggregated risk and STRIDE distribution for one analysis",
    responses={401: {"description": "Authentication required"}, 404: {"description": "Analysis not found"}},
)
async def get_analysis_summary(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get risk summary for a specific analysis."""
    analysis = _get_user_analysis(db, analysis_id=analysis_id, user_id=current_user.id)
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis with id {analysis_id} not found",
        )

    threats = [
        {
            "risk_level": threat.risk_level,
            "risk_score": threat.risk_score,
            "stride_category": threat.stride_category,
        }
        for threat in analysis.threats
    ]

    summary = risk_service.get_risk_summary(threats)
    summary["analysis_id"] = analysis_id
    summary["title"] = analysis.title
    return summary


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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download an analysis report as PDF."""
    analysis = _get_user_analysis(db, analysis_id=analysis_id, user_id=current_user.id)
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an analysis and related threats for current user."""
    analysis = _get_user_analysis(db, analysis_id=analysis_id, user_id=current_user.id)
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis with id {analysis_id} not found",
        )

    audit_service.record_event(
        db,
        user_id=current_user.id,
        action="analysis_deleted",
        analysis_id=analysis.id,
        event_metadata={
            "title": analysis.title,
            "threat_count": len(analysis.threats),
            "total_risk_score": analysis.total_risk_score,
        },
    )
    db.delete(analysis)
    db.commit()
    return None
