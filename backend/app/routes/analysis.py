import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, selectinload
from typing import List
from app.database import get_db
from app.models.analysis import Analysis, Threat
from app.models.user import User
from app.schemas.analysis import (
    AnalysisCreate, AnalysisResponse, AnalysisRiskSummary, AnalysisSummary
)
from app.services.llm_service import llm_service
from app.services.risk_service import risk_service
from app.services.auth_service import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/analyze", response_model=AnalysisResponse, status_code=status.HTTP_201_CREATED)
async def create_analysis(
    request: AnalysisCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new threat analysis for the given system description.
    Uses STRIDE methodology to identify and categorize threats.
    Requires authentication.
    """
    try:
        # Get threats from LLM with timing
        threat_data, analysis_time = await llm_service.analyze_system(request.system_description)
        
        # Create analysis record
        analysis = Analysis(
            user_id=current_user.id,
            title=request.title,
            system_description=request.system_description,
            analysis_time=analysis_time
        )
        db.add(analysis)
        db.flush()  # Get the ID
        
        # Process and store threats
        threats = []
        for t in threat_data:
            # Validate required fields exist
            if not all(k in t for k in ['name', 'description', 'stride_category', 
                                          'affected_component', 'likelihood', 'impact', 'mitigation']):
                continue  # Skip malformed threats
            
            # Calculate risk score
            risk_score = risk_service.calculate_risk_score(
                t['likelihood'], 
                t['impact']
            )
            
            # Calculate risk level based on score
            calculated_risk_level = risk_service.get_risk_level_from_score(risk_score)
            
            threat = Threat(
                analysis_id=analysis.id,
                name=t['name'],
                description=t['description'],
                stride_category=t['stride_category'],
                affected_component=t['affected_component'],
                risk_level=calculated_risk_level,
                likelihood=t['likelihood'],
                impact=t['impact'],
                risk_score=risk_score,
                mitigation=t['mitigation']
            )
            db.add(threat)
            threats.append(threat)
        
        if not threats:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Analysis failed: No valid threats could be generated"
            )
        
        # Calculate total risk score
        threat_dicts = [{'risk_score': t.risk_score} for t in threats]
        analysis.total_risk_score = risk_service.calculate_total_risk_score(threat_dicts)
        
        db.commit()
        db.refresh(analysis)
        
        return analysis
    
    except HTTPException:
        db.rollback()
        raise
    except RuntimeError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Analysis failed: {str(e)}"
        )
    except Exception:
        db.rollback()
        logger.exception("Unexpected error while creating analysis")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Analysis failed due to an internal server error"
        )


@router.get("/analyses", response_model=List[AnalysisSummary])
async def list_analyses(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List user's analyses with summary information.
    Requires authentication.
    """
    analyses = (
        db.query(Analysis)
        .options(selectinload(Analysis.threats))
        .filter(Analysis.user_id == current_user.id)
        .order_by(Analysis.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    summaries = []
    for analysis in analyses:
        high_risk_count = sum(1 for t in analysis.threats if t.risk_level in ['High', 'Critical'])
        summaries.append(AnalysisSummary(
            id=analysis.id,
            title=analysis.title,
            created_at=analysis.created_at,
            total_risk_score=analysis.total_risk_score,
            threat_count=len(analysis.threats),
            high_risk_count=high_risk_count,
            analysis_time=analysis.analysis_time or 0.0
        ))
    
    return summaries


@router.get("/analyses/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(
    analysis_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific analysis with all threats.
    Requires authentication. Users can only access their own analyses.
    """
    analysis = (
        db.query(Analysis)
        .options(selectinload(Analysis.threats))
        .filter(
            Analysis.id == analysis_id,
            Analysis.user_id == current_user.id
        )
        .first()
    )
    
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis with id {analysis_id} not found"
        )
    
    return analysis


@router.get("/analyses/{analysis_id}/summary", response_model=AnalysisRiskSummary)
async def get_analysis_summary(
    analysis_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get risk summary for a specific analysis.
    Requires authentication.
    """
    analysis = (
        db.query(Analysis)
        .options(selectinload(Analysis.threats))
        .filter(
            Analysis.id == analysis_id,
            Analysis.user_id == current_user.id
        )
        .first()
    )
    
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis with id {analysis_id} not found"
        )
    
    threats = [
        {
            'risk_level': t.risk_level,
            'risk_score': t.risk_score,
            'stride_category': t.stride_category
        }
        for t in analysis.threats
    ]
    
    summary = risk_service.get_risk_summary(threats)
    summary['analysis_id'] = analysis_id
    summary['title'] = analysis.title
    
    return summary


@router.delete("/analyses/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_analysis(
    analysis_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete an analysis and all associated threats.
    Requires authentication. Users can only delete their own analyses.
    """
    analysis = db.query(Analysis).filter(
        Analysis.id == analysis_id,
        Analysis.user_id == current_user.id
    ).first()
    
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis with id {analysis_id} not found"
        )
    
    db.delete(analysis)
    db.commit()
    
    return None
