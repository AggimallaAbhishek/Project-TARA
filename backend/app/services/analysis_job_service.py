import logging
import os
import re
import uuid
from pathlib import Path
from typing import Any

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import SessionLocal
from app.models.analysis import AnalysisJob
from app.models.user import User
from app.schemas.analysis import AnalysisCreate
from app.schemas.diagram import DiagramAnalyzeRequest, DiagramCodeAnalyzeRequest
from app.services.analysis_workflow_service import analysis_workflow_service
from app.services.diagram_extract_service import DiagramExtractionError, diagram_extract_service
from app.services.document_extract_service import DocumentExtractionError, document_extract_service
from app.services.extract_session_service import extract_session_service
from app.services.source_context_service import build_source_context

logger = logging.getLogger(__name__)

JOB_STATUS_QUEUED = "queued"
JOB_STATUS_RUNNING = "running"
JOB_STATUS_SUCCEEDED = "succeeded"
JOB_STATUS_FAILED = "failed"


def _source_type_from_metadata(prefix: str, metadata: dict[str, Any]) -> str:
    input_type = str(metadata.get("input_type") or "").strip().lower()
    if prefix == "document":
        if input_type == "pdf_scanned":
            return "document_pdf_scanned"
        if input_type == "pdf":
            return "document_pdf"
        return "document_txt"
    if prefix == "diagram":
        return f"diagram_{input_type or 'file'}"
    return prefix


class AnalysisJobService:
    def _stage_root(self) -> Path:
        stage_root = Path(get_settings().analysis_job_stage_dir)
        stage_root.mkdir(parents=True, exist_ok=True)
        return stage_root

    @staticmethod
    def _safe_suffix(filename: str) -> str:
        suffix = Path(filename or "upload.bin").suffix.lower()
        return re.sub(r"[^a-z0-9.]", "", suffix)[:16] or ".bin"

    async def stage_upload(self, file: UploadFile, max_bytes: int) -> tuple[str, int]:
        file_bytes = await file.read()
        if len(file_bytes) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail=f"File is too large. Maximum allowed size is {max_bytes // (1024 * 1024)} MB.",
            )
        stage_path = self._stage_root() / f"{uuid.uuid4().hex}{self._safe_suffix(file.filename or '')}"
        stage_path.write_bytes(file_bytes)
        logger.debug("analysis_job.file_staged path=%s size=%s", stage_path, len(file_bytes))
        return str(stage_path), len(file_bytes)

    def create_job(
        self,
        db: Session,
        *,
        user_id: int,
        source_type: str,
        payload: dict[str, Any],
        staged_file_path: str | None = None,
    ) -> AnalysisJob:
        job = AnalysisJob(
            job_id=uuid.uuid4().hex,
            user_id=user_id,
            source_type=source_type,
            payload=payload,
            staged_file_path=staged_file_path,
            status=JOB_STATUS_QUEUED,
            stage="queued",
            progress_percent=0.0,
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        logger.info("Analysis job created user_id=%s job_id=%s source_type=%s", user_id, job.job_id, source_type)
        return job

    @staticmethod
    def get_user_job(db: Session, *, job_id: str, user_id: int) -> AnalysisJob | None:
        return db.query(AnalysisJob).filter(AnalysisJob.job_id == job_id, AnalysisJob.user_id == user_id).first()

    def mark_interrupted_jobs_queued(self) -> int:
        db = SessionLocal()
        try:
            jobs = db.query(AnalysisJob).filter(AnalysisJob.status == JOB_STATUS_RUNNING).all()
            for job in jobs:
                job.status = JOB_STATUS_QUEUED
                job.stage = "queued"
                job.progress_percent = 0.0
            db.commit()
            if jobs:
                logger.info("Requeued interrupted analysis jobs count=%s", len(jobs))
            return len(jobs)
        finally:
            db.close()

    @staticmethod
    def _set_progress(db: Session, job: AnalysisJob, *, stage: str, progress: float) -> None:
        job.status = JOB_STATUS_RUNNING
        job.stage = stage
        job.progress_percent = max(0.0, min(100.0, progress))
        db.commit()
        logger.debug("analysis_job.progress job_id=%s stage=%s progress=%s", job.job_id, stage, progress)

    async def process_job(self, job_id: str) -> None:
        db = SessionLocal()
        staged_file_path: str | None = None
        try:
            job = db.query(AnalysisJob).filter(AnalysisJob.job_id == job_id).first()
            if not job:
                logger.warning("Analysis job missing job_id=%s", job_id)
                return
            current_user = db.query(User).filter(User.id == job.user_id).first()
            if not current_user:
                raise RuntimeError("Job user no longer exists.")

            payload = job.payload or {}
            staged_file_path = job.staged_file_path
            self._set_progress(db, job, stage="preparing_input", progress=10)

            if job.source_type == "text":
                request = AnalysisCreate(**payload)
                source_context = build_source_context(
                    source_type="text",
                    raw_or_extracted_text=request.system_description,
                    source_metadata={"input_type": "text"},
                )
                self._set_progress(db, job, stage="running_ollama", progress=35)
                analysis = await analysis_workflow_service.create_analysis(
                    db=db,
                    current_user=current_user,
                    title=request.title,
                    system_description=request.system_description,
                    project_id=request.project_id,
                    project_name=request.project_name,
                    source="text",
                    source_context=source_context,
                )
            elif job.source_type == "document":
                file_path = Path(str(staged_file_path or ""))
                if not file_path.exists():
                    raise RuntimeError("Staged upload file is missing.")
                extracted_description, source_metadata = await document_extract_service.extract_from_upload(
                    file_name=str(payload.get("file_name") or file_path.name),
                    content_type=payload.get("content_type"),
                    file_bytes=file_path.read_bytes(),
                )
                source_type = _source_type_from_metadata("document", source_metadata)
                source_context = build_source_context(
                    source_type=source_type,
                    raw_or_extracted_text=extracted_description,
                    source_metadata=source_metadata,
                    structured_context=source_metadata.get("structured_context"),
                    editable_summary=source_metadata.get("editable_summary"),
                )
                self._set_progress(db, job, stage="running_ollama", progress=45)
                request = AnalysisCreate(
                    title=str(payload.get("title") or ""),
                    system_description=extracted_description,
                    project_id=payload.get("project_id"),
                    project_name=payload.get("project_name"),
                )
                analysis = await analysis_workflow_service.create_analysis(
                    db=db,
                    current_user=current_user,
                    title=request.title,
                    system_description=request.system_description,
                    project_id=request.project_id,
                    project_name=request.project_name,
                    source="document",
                    source_context=source_context,
                )
            elif job.source_type == "diagram":
                request = DiagramAnalyzeRequest(**payload)
                session_payload = extract_session_service.get_session(
                    extract_id=request.extract_id,
                    user_id=current_user.id,
                )
                if not session_payload:
                    raise RuntimeError("Diagram extraction session not found or expired.")
                system_description = (
                    request.system_description
                    if request.system_description is not None
                    else session_payload.get("extracted_system_description", "")
                ).strip()
                if len(system_description) < 10:
                    raise RuntimeError("system_description must be at least 10 characters.")
                source_metadata = session_payload.get("source_metadata") or {}
                source_context = build_source_context(
                    source_type=_source_type_from_metadata("diagram", source_metadata),
                    raw_or_extracted_text=system_description,
                    source_metadata=source_metadata,
                    structured_context=source_metadata.get("structured_context"),
                    editable_summary=source_metadata.get("editable_summary") or system_description,
                )
                self._set_progress(db, job, stage="running_ollama", progress=45)
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
                    source_context=source_context,
                )
                extract_session_service.delete_session(request.extract_id)
            elif job.source_type == "uml":
                request = DiagramCodeAnalyzeRequest(**payload)
                extracted_description = diagram_extract_service.extract_from_uml_code(
                    uml_format=request.uml_format,
                    uml_code=request.uml_code,
                )
                source_type = f"uml_{request.uml_format}"
                source_context = build_source_context(
                    source_type=source_type,
                    raw_or_extracted_text=extracted_description,
                    source_metadata={
                        "input_type": request.uml_format,
                        "extractor_used": f"{request.uml_format}_parser_v1",
                        "code_length": len(request.uml_code),
                    },
                )
                self._set_progress(db, job, stage="running_ollama", progress=45)
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
                    source_context=source_context,
                )
            else:
                raise RuntimeError(f"Unsupported analysis job source type: {job.source_type}")

            job.analysis_id = analysis.id
            job.status = JOB_STATUS_SUCCEEDED
            job.stage = "completed"
            job.progress_percent = 100.0
            db.commit()
            logger.info("Analysis job completed job_id=%s analysis_id=%s", job.job_id, analysis.id)
        except (DocumentExtractionError, DiagramExtractionError, ValueError, RuntimeError) as exc:
            self._mark_failed(db, job_id, str(exc))
        except Exception:
            logger.exception("Unexpected analysis job failure job_id=%s", job_id)
            self._mark_failed(db, job_id, "Analysis job failed due to an internal server error.")
        finally:
            if staged_file_path:
                try:
                    os.unlink(staged_file_path)
                    logger.debug("analysis_job.staged_file_deleted path=%s", staged_file_path)
                except FileNotFoundError:
                    pass
                except Exception:
                    logger.debug("Failed to delete staged upload path=%s", staged_file_path, exc_info=True)
            db.close()

    @staticmethod
    def _mark_failed(db: Session, job_id: str, error: str) -> None:
        job = db.query(AnalysisJob).filter(AnalysisJob.job_id == job_id).first()
        if not job:
            return
        job.status = JOB_STATUS_FAILED
        job.stage = "failed"
        job.error = error
        db.commit()
        logger.warning("Analysis job failed job_id=%s error=%s", job_id, error)


analysis_job_service = AnalysisJobService()
