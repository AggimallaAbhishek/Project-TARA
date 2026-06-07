import logging
import inspect
from time import perf_counter
from typing import Any

from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analysis import Analysis, Threat
from app.models.user import User
from app.services.audit_service import audit_service
from app.services.email_service import email_service
from app.services.llm_service import llm_service
from app.services.project_service import project_service
from app.services.risk_service import risk_service

logger = logging.getLogger(__name__)


class AnalysisWorkflowService:
    async def _analyze_with_optional_context(
        self,
        system_description: str,
        source_context: dict[str, Any] | None,
    ) -> tuple[list[dict[str, Any]], float]:
        analyze_signature = inspect.signature(llm_service.analyze_system)
        if "source_context" in analyze_signature.parameters:
            return await llm_service.analyze_system(system_description, source_context=source_context)
        return await llm_service.analyze_system(system_description)

    async def create_analysis(
        self,
        *,
        db: AsyncSession,
        current_user: User,
        title: str,
        system_description: str,
        project_id: int | None = None,
        project_name: str | None = None,
        diagram_format: str | None = None,
        diagram_code: str | None = None,
        source: str = "text",
        source_context: dict[str, Any] | None = None,
        background_tasks: BackgroundTasks | None = None,
    ) -> Analysis:
        request_start = perf_counter()
        try:
            project = await project_service.resolve_project_for_analysis(
                db,
                current_user=current_user,
                title=title,
                project_id=project_id,
                project_name=project_name,
            )
            threat_data, analysis_time = await self._analyze_with_optional_context(system_description, source_context)
            source_context = source_context or {
                "source_type": source,
                "source_metadata": {},
                "structured_context": {},
                "editable_summary": system_description,
            }

            analysis = Analysis(
                user_id=current_user.id,
                project_id=project.id,
                title=title,
                system_description=system_description,
                analysis_time=analysis_time,
                diagram_format=(diagram_format or None),
                diagram_code=(diagram_code or None),
                source_type=source_context.get("source_type") or source,
                source_metadata=source_context.get("source_metadata") or {},
                structured_context=source_context.get("structured_context") or {},
                quality_warnings=source_context.get("quality_warnings") or [],
            )
            db.add(analysis)
            await db.flush()

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
                    evidence=threat_item.get("evidence") or [],
                    assumptions=threat_item.get("assumptions") or [],
                    confidence=threat_item.get("confidence"),
                    owasp_tags=threat_item.get("owasp_tags") or [],
                    cwe_tags=threat_item.get("cwe_tags") or [],
                )
                db.add(threat)
                threats.append(threat)

            if not threats:
                await db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Analysis failed: No valid threats could be generated",
                )

            threat_dicts = [{"risk_score": threat.risk_score} for threat in threats]
            analysis.total_risk_score = risk_service.calculate_total_risk_score(threat_dicts)

            await audit_service.record_event(
                db,
                user_id=current_user.id,
                action="analysis_created",
                analysis_id=analysis.id,
                project_id=project.id,
                event_metadata={
                    "project_id": project.id,
                    "project_name": project.name,
                    "source": source,
                    "source_type": analysis.source_type,
                    "diagram_format": (diagram_format or None),
                    "diagram_code_length": len(diagram_code or ""),
                    "title": analysis.title,
                    "threat_count": len(threats),
                    "total_risk_score": analysis.total_risk_score,
                },
            )

            await db.commit()
            await db.refresh(analysis)
            total_elapsed = perf_counter() - request_start
            logger.info(
                "Analysis created user_id=%s project_id=%s analysis_id=%s source=%s threats=%s llm_time=%.2fs total=%.2fs",
                current_user.id,
                project.id,
                analysis.id,
                source,
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
            await db.rollback()
            raise
        except ValueError as exc:
            await db.rollback()
            status_code = status.HTTP_404_NOT_FOUND if "not found" in str(exc) else status.HTTP_409_CONFLICT
            logger.warning(
                "Analysis project resolution failed user_id=%s status=%s error=%s",
                current_user.id,
                status_code,
                str(exc),
            )
            raise HTTPException(status_code=status_code, detail=str(exc))
        except RuntimeError as exc:
            await db.rollback()
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
            await db.rollback()
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
