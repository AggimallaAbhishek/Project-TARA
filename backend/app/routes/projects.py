from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_async_db
from app.models.analysis import Analysis
from app.models.audit import AuditLog
from app.models.project import Project
from app.models.user import User
from app.schemas.analysis import AnalysisListResponse
from app.schemas.project import (
    ProjectActivityResponse,
    ProjectCreate,
    ProjectListResponse,
    ProjectResponse,
    ProjectUpdate,
)
from app.services.auth_service import get_current_user
from app.services.project_service import project_service
from app.routes.analysis import _build_analysis_summary

router = APIRouter()


@router.get(
    "/projects",
    response_model=ProjectListResponse,
    summary="List projects",
    response_description="Paginated project summaries for the current user",
    responses={401: {"description": "Authentication required"}},
)
async def list_projects(
    q: str | None = Query(default=None, description="Case-insensitive search by project name"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    projects, total = await project_service.list_projects(
        db,
        user_id=current_user.id,
        q=q,
        skip=skip,
        limit=limit,
    )
    items = [project_service.build_project_response(project) for project in projects]
    return ProjectListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit,
        has_more=(skip + len(items)) < total,
    )


@router.post(
    "/projects",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create project",
    response_description="Created project summary",
    responses={
        401: {"description": "Authentication required"},
        409: {"description": "Project name already exists"},
    },
)
async def create_project(
    request: ProjectCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    try:
        project = await project_service.create_project(
            db,
            current_user=current_user,
            name=request.name,
            description=request.description,
        )
        await db.commit()
        await db.refresh(project)
        return project_service.build_project_response(project)
    except ValueError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.get(
    "/projects/{project_id}",
    response_model=ProjectResponse,
    summary="Get project",
    response_description="Project detail summary",
    responses={401: {"description": "Authentication required"}, 404: {"description": "Project not found"}},
)
async def get_project(
    project_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.analyses).selectinload(Analysis.threats))
        .where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Project with id {project_id} not found")
    return project_service.build_project_response(project)


@router.patch(
    "/projects/{project_id}",
    response_model=ProjectResponse,
    summary="Update project",
    response_description="Updated project summary",
    responses={
        401: {"description": "Authentication required"},
        404: {"description": "Project not found"},
        409: {"description": "Project name already exists"},
    },
)
async def update_project(
    project_id: int,
    request: ProjectUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    try:
        project = await project_service.get_project_or_raise(db, project_id=project_id, user_id=current_user.id)
        provided_fields = request.model_fields_set
        await project_service.update_project(
            db,
            project=project,
            current_user=current_user,
            name=request.name if "name" in provided_fields else None,
            description=request.description if "description" in provided_fields else None,
            update_description="description" in provided_fields,
        )
        await db.commit()
        await db.refresh(project)
        return project_service.build_project_response(project)
    except ValueError as exc:
        await db.rollback()
        detail = str(exc)
        code = status.HTTP_409_CONFLICT if "already exists" in detail else status.HTTP_404_NOT_FOUND
        raise HTTPException(status_code=code, detail=detail)


@router.get(
    "/projects/{project_id}/analyses",
    response_model=AnalysisListResponse,
    summary="List project analyses",
    response_description="Paginated analyses for one project",
    responses={401: {"description": "Authentication required"}, 404: {"description": "Project not found"}},
)
async def list_project_analyses(
    project_id: int,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    try:
        await project_service.get_project_or_raise(db, project_id=project_id, user_id=current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    filters = [Analysis.user_id == current_user.id, Analysis.project_id == project_id]

    count_result = await db.execute(select(func.count(Analysis.id)).where(*filters))
    total = count_result.scalar() or 0

    result = await db.execute(
        select(Analysis)
        .where(*filters)
        .options(selectinload(Analysis.threats), selectinload(Analysis.project))
        .order_by(Analysis.created_at.desc(), Analysis.id.desc())
        .offset(skip)
        .limit(limit)
    )
    analyses = list(result.scalars().all())

    items = [_build_analysis_summary(analysis) for analysis in analyses]
    return AnalysisListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit,
        has_more=(skip + len(items)) < total,
    )


@router.get(
    "/projects/{project_id}/activity",
    response_model=list[ProjectActivityResponse],
    summary="List project activity",
    response_description="Recent durable backend events for one project",
    responses={401: {"description": "Authentication required"}, 404: {"description": "Project not found"}},
)
async def list_project_activity(
    project_id: int,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    try:
        await project_service.get_project_or_raise(db, project_id=project_id, user_id=current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.user_id == current_user.id, AuditLog.project_id == project_id)
        .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())
