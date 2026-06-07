import logging
import re
from datetime import datetime, timezone
from typing import Iterable

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.analysis import Analysis
from app.models.project import Project
from app.models.user import User
from app.services.audit_service import audit_service

logger = logging.getLogger(__name__)


class ProjectService:
    @staticmethod
    def normalize_name(value: str) -> str:
        return re.sub(r"\s+", " ", value).strip().lower()

    @staticmethod
    def _display_name(value: str) -> str:
        cleaned = re.sub(r"\s+", " ", value).strip()
        return cleaned or "Untitled Project"

    async def get_project_for_user(self, db: AsyncSession, *, project_id: int, user_id: int) -> Project | None:
        result = await db.execute(
            select(Project).where(Project.id == project_id, Project.user_id == user_id)
        )
        return result.scalars().first()

    async def get_project_or_raise(self, db: AsyncSession, *, project_id: int, user_id: int) -> Project:
        project = await self.get_project_for_user(db, project_id=project_id, user_id=user_id)
        if not project:
            raise ValueError(f"Project with id {project_id} not found")
        return project

    async def find_by_normalized_name(self, db: AsyncSession, *, user_id: int, name: str) -> Project | None:
        normalized_name = self.normalize_name(name)
        result = await db.execute(
            select(Project).where(Project.user_id == user_id, Project.normalized_name == normalized_name)
        )
        return result.scalars().first()

    async def create_project(
        self,
        db: AsyncSession,
        *,
        current_user: User,
        name: str,
        description: str | None = None,
        record_audit: bool = True,
    ) -> Project:
        display_name = self._display_name(name)
        normalized_name = self.normalize_name(display_name)
        existing = await self.find_by_normalized_name(
            db,
            user_id=current_user.id,
            name=display_name,
        )
        if existing:
            raise ValueError("A project with this name already exists")

        project = Project(
            user_id=current_user.id,
            name=display_name,
            normalized_name=normalized_name,
            description=description,
        )
        db.add(project)
        try:
            await db.flush()
        except IntegrityError as exc:
            logger.warning(
                "Project create failed duplicate user_id=%s normalized_name=%s",
                current_user.id,
                normalized_name,
            )
            raise ValueError("A project with this name already exists") from exc

        if record_audit:
            await audit_service.record_event(
                db,
                user_id=current_user.id,
                project_id=project.id,
                action="project_created",
                event_metadata={
                    "project_id": project.id,
                    "project_name": project.name,
                },
            )

        logger.info("Project created user_id=%s project_id=%s", current_user.id, project.id)
        return project

    async def update_project(
        self,
        db: AsyncSession,
        *,
        project: Project,
        current_user: User,
        name: str | None = None,
        description: str | None = None,
        update_description: bool = False,
    ) -> Project:
        old_name = project.name
        changed_fields: list[str] = []

        if name is not None:
            display_name = self._display_name(name)
            normalized_name = self.normalize_name(display_name)
            if normalized_name != project.normalized_name:
                existing = await self.find_by_normalized_name(
                    db,
                    user_id=current_user.id,
                    name=display_name,
                )
                if existing and existing.id != project.id:
                    raise ValueError("A project with this name already exists")
            if display_name != project.name:
                project.name = display_name
                project.normalized_name = normalized_name
                changed_fields.append("name")

        if update_description and description != project.description:
            project.description = description
            changed_fields.append("description")

        if changed_fields:
            project.updated_at = datetime.now(timezone.utc)
            await db.flush()
            await audit_service.record_event(
                db,
                user_id=current_user.id,
                project_id=project.id,
                action="project_updated",
                event_metadata={
                    "project_id": project.id,
                    "project_name": project.name,
                    "old_name": old_name,
                    "changed_fields": changed_fields,
                },
            )
            logger.info(
                "Project updated user_id=%s project_id=%s fields=%s",
                current_user.id,
                project.id,
                changed_fields,
            )

        return project

    async def resolve_project_for_analysis(
        self,
        db: AsyncSession,
        *,
        current_user: User,
        title: str,
        project_id: int | None = None,
        project_name: str | None = None,
    ) -> Project:
        if project_id is not None:
            return await self.get_project_or_raise(
                db,
                project_id=project_id,
                user_id=current_user.id,
            )

        fallback_name = project_name or title
        existing = await self.find_by_normalized_name(
            db,
            user_id=current_user.id,
            name=fallback_name,
        )
        if existing:
            return existing

        return await self.create_project(
            db,
            current_user=current_user,
            name=fallback_name,
            record_audit=True,
        )

    async def list_projects(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        q: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[Project], int]:
        base_filter = [Project.user_id == user_id]
        if q and q.strip():
            safe_q = q.strip().replace("%", r"\%").replace("_", r"\_")
            base_filter.append(Project.name.ilike(f"%{safe_q}%", escape="\\"))

        count_result = await db.execute(
            select(func.count(Project.id)).where(*base_filter)
        )
        total = count_result.scalar() or 0

        result = await db.execute(
            select(Project)
            .where(*base_filter)
            .options(selectinload(Project.analyses).selectinload(Analysis.threats))
            .order_by(Project.updated_at.desc(), Project.id.desc())
            .offset(skip)
            .limit(limit)
        )
        projects = list(result.scalars().all())
        return projects, total

    @staticmethod
    def build_project_response(project: Project) -> dict:
        analyses = list(project.analyses or [])
        latest_analysis = max(analyses, key=lambda analysis: (analysis.created_at, analysis.id), default=None)
        total_threat_count = 0
        high_risk_count = 0

        for analysis in analyses:
            total_threat_count += len(analysis.threats or [])
            high_risk_count += sum(
                1 for threat in analysis.threats or [] if threat.risk_level in {"High", "Critical"}
            )

        return {
            "id": project.id,
            "user_id": project.user_id,
            "name": project.name,
            "description": project.description,
            "created_at": project.created_at,
            "updated_at": project.updated_at,
            "analysis_count": len(analyses),
            "latest_analysis_id": latest_analysis.id if latest_analysis else None,
            "latest_analysis_title": latest_analysis.title if latest_analysis else None,
            "latest_analysis_at": latest_analysis.created_at if latest_analysis else None,
            "latest_risk_score": latest_analysis.total_risk_score if latest_analysis else None,
            "total_threat_count": total_threat_count,
            "high_risk_count": high_risk_count,
        }

    @staticmethod
    def analysis_project_reference(analysis: Analysis) -> dict | None:
        if not analysis.project:
            return None
        return {
            "id": analysis.project.id,
            "name": analysis.project.name,
        }

    @staticmethod
    def project_ids_for_analyses(analyses: Iterable[Analysis]) -> set[int]:
        return {
            analysis.project_id
            for analysis in analyses
            if analysis.project_id is not None
        }


project_service = ProjectService()
