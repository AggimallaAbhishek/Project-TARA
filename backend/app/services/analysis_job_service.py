import asyncio
import logging
import os
import re
import time
import uuid
from contextlib import suppress
from pathlib import Path
from typing import Any

from fastapi import UploadFile
from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import AsyncSessionLocal, SessionLocal
from app.models.analysis import AnalysisJob
from app.models.user import User
from app.schemas.analysis import AnalysisCreate
from app.schemas.diagram import DiagramAnalyzeRequest, DiagramCodeAnalyzeRequest
from app.services.analysis_workflow_service import analysis_workflow_service
from app.services.diagram_extract_service import DiagramExtractionError, diagram_extract_service
from app.services.document_extract_service import DocumentExtractionError, document_extract_service
from app.services.extract_session_service import extract_session_service
from app.services.source_context_service import build_source_context
from app.utils.errors import safe_detail
from app.utils.uploads import stream_upload_to_path

logger = logging.getLogger(__name__)

JOB_STATUS_QUEUED = "queued"
JOB_STATUS_RUNNING = "running"
JOB_STATUS_SUCCEEDED = "succeeded"
JOB_STATUS_FAILED = "failed"

# How long to wait for a cold Ollama before abandoning the startup drain.
PROVIDER_READY_TIMEOUT_SECONDS = 120.0
PROVIDER_READY_POLL_SECONDS = 5.0


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
        """Stream an upload to the staging directory, aborting past ``max_bytes``.

        Streaming straight to disk keeps a large upload from being buffered in
        memory before the size check, and leaves nothing behind if it is
        rejected mid-write.
        """
        stage_path = self._stage_root() / f"{uuid.uuid4().hex}{self._safe_suffix(file.filename or '')}"
        file_size = await stream_upload_to_path(file, stage_path, max_bytes)
        logger.debug("analysis_job.file_staged path=%s size=%s", stage_path, file_size)
        return str(stage_path), file_size

    async def create_job(
        self,
        db: AsyncSession,
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
        await db.commit()
        await db.refresh(job)
        logger.info("Analysis job created user_id=%s job_id=%s source_type=%s", user_id, job.job_id, source_type)
        return job

    @staticmethod
    async def get_user_job(db: AsyncSession, *, job_id: str, user_id: int) -> AnalysisJob | None:
        result = await db.execute(
            select(AnalysisJob).where(AnalysisJob.job_id == job_id, AnalysisJob.user_id == user_id)
        )
        return result.scalars().first()

    def mark_interrupted_jobs_queued(self) -> int:
        """Synchronous startup hook — uses sync session since called from lifespan."""
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
        except SQLAlchemyError as exc:
            logger.warning("Could not requeue interrupted analysis jobs on startup: %s", exc)
            return 0
        finally:
            db.close()

    @staticmethod
    async def list_queued_job_ids() -> list[str]:
        """Return queued job ids, oldest first; empty if the database is unreachable."""
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(AnalysisJob.job_id)
                    .where(AnalysisJob.status == JOB_STATUS_QUEUED)
                    .order_by(AnalysisJob.created_at.asc())
                )
                return list(result.scalars().all())
        except Exception as exc:
            logger.warning("Could not list queued analysis jobs to drain: %s", exc)
            return []

    async def drain_queued_jobs(self) -> int:
        """Run every queued job, bounded by ``analysis_job_worker_concurrency``.

        Jobs are normally dispatched by BackgroundTasks at request time, so a
        job requeued by :meth:`mark_interrupted_jobs_queued` after a restart had
        nothing to pick it up and sat at "queued" forever while the client
        polled. This drains that backlog on startup.

        Draining is best-effort: it runs as a background task off the startup
        path, so a failure here must never take down the application. Anything
        left queued is picked up by the next restart.
        """
        job_ids = await self.list_queued_job_ids()
        if not job_ids:
            return 0

        if not await self._await_provider_ready():
            logger.warning(
                "Abandoning queued job drain: LLM provider never became ready count=%s. "
                "Jobs stay queued for the next restart.",
                len(job_ids),
            )
            return 0

        # Re-read: the wait above is long enough for request-time dispatch to
        # have claimed some of these already. The atomic claim in process_job is
        # what actually prevents double execution; this just avoids the noise.
        job_ids = await self.list_queued_job_ids()
        if not job_ids:
            return 0

        concurrency = max(1, get_settings().analysis_job_worker_concurrency)
        semaphore = asyncio.Semaphore(concurrency)
        logger.info(
            "Draining queued analysis jobs count=%s concurrency=%s", len(job_ids), concurrency
        )

        async def run(job_id: str) -> None:
            async with semaphore:
                try:
                    await self.process_job(job_id)
                except asyncio.CancelledError:
                    raise
                except Exception:
                    # process_job already records failures; never let one job
                    # abort the rest of the drain.
                    logger.exception("Queued job drain failed job_id=%s", job_id)

        await asyncio.gather(*(run(job_id) for job_id in job_ids))
        logger.info("Drained queued analysis jobs count=%s", len(job_ids))
        return len(job_ids)

    @staticmethod
    async def _set_progress(db: AsyncSession, job: AnalysisJob, *, stage: str, progress: float) -> None:
        job.status = JOB_STATUS_RUNNING
        job.stage = stage
        job.progress_percent = max(0.0, min(100.0, progress))
        await db.commit()
        logger.debug("analysis_job.progress job_id=%s stage=%s progress=%s", job.job_id, stage, progress)

    async def process_job(self, job_id: str) -> None:
        async with AsyncSessionLocal() as db:
            staged_file_path: str | None = None
            try:
                result = await db.execute(select(AnalysisJob).where(AnalysisJob.job_id == job_id))
                job = result.scalars().first()
                if not job:
                    logger.warning("Analysis job missing job_id=%s", job_id)
                    return
                user_result = await db.execute(select(User).where(User.id == job.user_id))
                current_user = user_result.scalars().first()
                if not current_user:
                    raise RuntimeError("Job user no longer exists.")

                payload = job.payload or {}
                staged_file_path = job.staged_file_path

                # Claim the job atomically. The startup drain and the request-time
                # BackgroundTasks dispatcher can both reach the same job, as can
                # two uvicorn workers; only the writer that flips queued->running
                # proceeds.
                claim = await db.execute(
                    update(AnalysisJob)
                    .where(
                        AnalysisJob.job_id == job_id,
                        AnalysisJob.status == JOB_STATUS_QUEUED,
                    )
                    .values(
                        status=JOB_STATUS_RUNNING,
                        stage="preparing_input",
                        progress_percent=10.0,
                    )
                )
                await db.commit()
                if claim.rowcount != 1:
                    logger.info("Analysis job already claimed elsewhere job_id=%s", job_id)
                    staged_file_path = None  # the claiming worker owns the file
                    return
                await db.refresh(job)

                if job.source_type == "text":
                    request = AnalysisCreate(**payload)
                    source_context = build_source_context(
                        source_type="text",
                        raw_or_extracted_text=request.system_description,
                        source_metadata={"input_type": "text"},
                    )
                    await self._set_progress(db, job, stage="running_ollama", progress=35)
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
                    await self._set_progress(db, job, stage="running_ollama", progress=45)
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
                    await self._set_progress(db, job, stage="running_ollama", progress=45)
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
                    await self._set_progress(db, job, stage="running_ollama", progress=45)
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
                await db.commit()
                logger.info("Analysis job completed job_id=%s analysis_id=%s", job.job_id, analysis.id)
            except (DocumentExtractionError, DiagramExtractionError) as exc:
                # Extraction errors are written for the user by design.
                await self._mark_failed(db, job_id, str(exc))
            except (ValueError, RuntimeError) as exc:
                # job.error is served by GET /api/analysis-jobs/{id}, so only
                # curated messages may be persisted here.
                logger.warning("Analysis job failed job_id=%s", job_id, exc_info=True)
                await self._mark_failed(db, job_id, safe_detail(exc, "Analysis failed."))
            except Exception:
                logger.exception("Unexpected analysis job failure job_id=%s", job_id)
                await self._mark_failed(db, job_id, "Analysis job failed due to an internal server error.")
            except asyncio.CancelledError:
                # Shutdown cancelled us mid-job. Hand the job back so the next
                # boot can retry it, and keep the staged file it will need.
                logger.info("Analysis job cancelled, requeueing job_id=%s", job_id)
                staged_file_path = None
                with suppress(Exception):
                    await db.rollback()
                    await db.execute(
                        update(AnalysisJob)
                        .where(AnalysisJob.job_id == job_id)
                        .values(status=JOB_STATUS_QUEUED, stage="queued", progress_percent=0.0)
                    )
                    await db.commit()
                raise
            finally:
                # Only reached with staged_file_path set when the job actually
                # finished (or failed terminally) - a cancelled job clears it
                # above so its upload survives for the retry.
                if staged_file_path:
                    try:
                        os.unlink(staged_file_path)
                        logger.debug("analysis_job.staged_file_deleted path=%s", staged_file_path)
                    except FileNotFoundError:
                        pass
                    except Exception:
                        logger.debug("Failed to delete staged upload path=%s", staged_file_path, exc_info=True)

    async def _await_provider_ready(self) -> bool:
        """Poll for LLM readiness before draining, instead of giving up at once.

        Nothing orders Ollama ahead of the backend, so the provider is routinely
        cold for the first seconds after a restart. Skipping on the first miss
        would strand the backlog for the whole process lifetime.
        """
        deadline = time.monotonic() + PROVIDER_READY_TIMEOUT_SECONDS
        while True:
            if await self._provider_is_ready():
                return True
            if time.monotonic() >= deadline:
                return False
            logger.info(
                "LLM provider not ready yet; retrying job drain in %ss",
                PROVIDER_READY_POLL_SECONDS,
            )
            await asyncio.sleep(PROVIDER_READY_POLL_SECONDS)

    @staticmethod
    async def _provider_is_ready() -> bool:
        """Is the LLM provider reachable enough to be worth draining into?

        Nothing orders Ollama ahead of the backend, so a drain that fired during
        startup could mark every requeued job terminally failed. Skipping leaves
        them queued instead.
        """
        try:
            from app.services.model_readiness_service import model_readiness_service

            readiness = await model_readiness_service.check(force_refresh=True)
            return bool(readiness.get("text", {}).get("available"))
        except Exception:
            logger.warning("Could not determine LLM readiness before draining", exc_info=True)
            return False

    @staticmethod
    async def _mark_failed(db: AsyncSession, job_id: str, error: str) -> None:
        # The caller reaches here from an exception that may have failed mid-flush,
        # which leaves the session unusable until it is rolled back - the query
        # below would otherwise raise PendingRollbackError and the job would stay
        # stuck at "running" forever.
        try:
            await db.rollback()
        except Exception:
            logger.warning("Could not roll back before failing job job_id=%s", job_id, exc_info=True)

        result = await db.execute(select(AnalysisJob).where(AnalysisJob.job_id == job_id))
        job = result.scalars().first()
        if not job:
            return
        job.status = JOB_STATUS_FAILED
        job.stage = "failed"
        job.error = error
        await db.commit()
        logger.warning("Analysis job failed job_id=%s error=%s", job_id, error)


analysis_job_service = AnalysisJobService()
