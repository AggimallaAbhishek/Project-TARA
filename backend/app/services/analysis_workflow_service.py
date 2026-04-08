import logging
from time import perf_counter

from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy.orm import Session

from app.models.analysis import Analysis, Threat
from app.models.user import User
from app.services.audit_service import audit_service
from app.services.email_service import email_service
from app.services.llm_service import llm_service
from app.services.risk_service import risk_service

logger = logging.getLogger(__name__)


class AnalysisWorkflowService:
    async def create_analysis(
        self,
        *,
        db: Session,
        current_user: User,
        title: str,
        system_description: str,
        background_tasks: BackgroundTasks | None = None,
    ) -> Analysis:
        request_start = perf_counter()
        try:
            threat_data, analysis_time = await llm_service.analyze_system(system_description)

            analysis = Analysis(
                user_id=current_user.id,
                title=title,
                system_description=system_description,
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

            if background_tasks is not None:
                risk_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
                for threat in threats:
                    if threat.risk_level in risk_counts:
                        risk_counts[threat.risk_level] += 1
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


analysis_workflow_service = AnalysisWorkflowService()
