"""Jobs requeued after a restart must actually be dispatched, not just relabelled."""
import asyncio
import pathlib
import sys
import unittest
from unittest.mock import patch

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.database import Base
from app.models.analysis import AnalysisJob
from app.models.user import User
from app.utils.errors import UserFacingError
from app.services import analysis_job_service as job_module
from app.services.analysis_job_service import (
    JOB_STATUS_QUEUED,
    JOB_STATUS_RUNNING,
    analysis_job_service,
)


class JobDrainTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        self.SessionLocal = async_sessionmaker(
            bind=self.engine, class_=AsyncSession, expire_on_commit=False
        )
        # drain_queued_jobs opens its own sessions
        self._patcher = patch.object(job_module, "AsyncSessionLocal", self.SessionLocal)
        self._patcher.start()
        # Without this the drain would consult the real Ollama, making every
        # test below pass or fail depending on whether one happens to be running.
        self._ready_patcher = patch.object(
            analysis_job_service, "_await_provider_ready", return_value=True
        )
        self._ready_patcher.start()

        async with self.SessionLocal() as db:
            user = User(email="drain@example.com", name="Drain", google_id="drain-google-id")
            db.add(user)
            await db.commit()
            await db.refresh(user)
            self.user_id = user.id

    async def asyncTearDown(self):
        self._ready_patcher.stop()
        self._patcher.stop()
        await self.engine.dispose()

    async def _add_job(self, job_id: str, status: str = JOB_STATUS_QUEUED) -> None:
        async with self.SessionLocal() as db:
            db.add(
                AnalysisJob(
                    job_id=job_id,
                    user_id=self.user_id,
                    source_type="text",
                    payload={"title": "t", "system_description": "d" * 20},
                    status=status,
                    stage="queued",
                    progress_percent=0.0,
                )
            )
            await db.commit()

    async def test_queued_jobs_are_dispatched(self):
        await self._add_job("job-a")
        await self._add_job("job-b")

        processed = []

        async def fake_process(job_id):
            processed.append(job_id)

        with patch.object(analysis_job_service, "process_job", side_effect=fake_process):
            count = await analysis_job_service.drain_queued_jobs()

        self.assertEqual(count, 2)
        self.assertEqual(sorted(processed), ["job-a", "job-b"])

    async def test_running_jobs_are_requeued_then_drained(self):
        """The restart path end to end: running -> queued -> actually processed."""
        await self._add_job("interrupted", status=JOB_STATUS_RUNNING)

        # mark_interrupted_jobs_queued is the sync half; emulate its effect
        async with self.SessionLocal() as db:
            result = await db.execute(
                select(AnalysisJob).where(AnalysisJob.job_id == "interrupted")
            )
            job = result.scalars().first()
            job.status = JOB_STATUS_QUEUED
            await db.commit()

        processed = []

        async def fake_process(job_id):
            processed.append(job_id)

        with patch.object(analysis_job_service, "process_job", side_effect=fake_process):
            await analysis_job_service.drain_queued_jobs()

        self.assertEqual(processed, ["interrupted"])

    async def test_one_failing_job_does_not_abort_the_drain(self):
        await self._add_job("bad")
        await self._add_job("good")

        processed = []

        async def fake_process(job_id):
            if job_id == "bad":
                raise RuntimeError("boom")
            processed.append(job_id)

        with patch.object(analysis_job_service, "process_job", side_effect=fake_process):
            count = await analysis_job_service.drain_queued_jobs()

        self.assertEqual(count, 2)
        self.assertEqual(processed, ["good"])

    async def test_concurrency_setting_is_respected(self):
        for i in range(6):
            await self._add_job(f"job-{i}")

        in_flight = 0
        peak = 0

        async def fake_process(job_id):
            nonlocal in_flight, peak
            in_flight += 1
            peak = max(peak, in_flight)
            await asyncio.sleep(0)
            in_flight -= 1

        with patch.object(analysis_job_service, "process_job", side_effect=fake_process):
            await analysis_job_service.drain_queued_jobs()

        # analysis_job_worker_concurrency defaults to 1
        self.assertEqual(peak, 1, f"drain ran {peak} jobs at once")

    async def test_no_queued_jobs_is_a_noop(self):
        self.assertEqual(await analysis_job_service.drain_queued_jobs(), 0)

    async def test_drain_is_skipped_when_the_provider_is_not_ready(self):
        """Draining into a cold Ollama would fail the whole backlog terminally."""
        await self._add_job("job-a")
        processed = []

        async def fake_process(job_id):
            processed.append(job_id)

        with patch.object(analysis_job_service, "_await_provider_ready", return_value=False):
            with patch.object(analysis_job_service, "process_job", side_effect=fake_process):
                count = await analysis_job_service.drain_queued_jobs()

        self.assertEqual(count, 0)
        self.assertEqual(processed, [])

        # the job must still be queued, ready for the next restart
        async with self.SessionLocal() as db:
            result = await db.execute(select(AnalysisJob).where(AnalysisJob.job_id == "job-a"))
            self.assertEqual(result.scalars().first().status, JOB_STATUS_QUEUED)

    async def test_a_job_is_claimed_once_even_if_dispatched_twice(self):
        """BackgroundTasks and the startup drain can both reach the same job."""
        await self._add_job("contended")
        runs = []

        async def counting_workflow(**kwargs):
            runs.append(kwargs)
            raise RuntimeError("stop after the claim")

        with patch.object(job_module.analysis_workflow_service, "create_analysis",
                          side_effect=counting_workflow):
            await asyncio.gather(
                analysis_job_service.process_job("contended"),
                analysis_job_service.process_job("contended"),
            )

        self.assertEqual(len(runs), 1, "the job was processed more than once")

    async def test_failure_is_recorded_even_after_a_poisoned_flush(self):
        """A job whose flush failed must still be marked failed, not left running."""
        await self._add_job("poisoned")

        async def poison_then_fail(**kwargs):
            # dirty the session the way a real mid-transaction failure does
            db = kwargs["db"]
            db.add(AnalysisJob(job_id=None, user_id=None, source_type="text"))
            try:
                await db.flush()
            except Exception:
                pass
            raise RuntimeError("workflow blew up")

        with patch.object(job_module.analysis_workflow_service, "create_analysis",
                          side_effect=poison_then_fail):
            await analysis_job_service.process_job("poisoned")

        async with self.SessionLocal() as db:
            result = await db.execute(select(AnalysisJob).where(AnalysisJob.job_id == "poisoned"))
            job = result.scalars().first()
            self.assertEqual(job.status, "failed")
            # job.error is served by GET /api/analysis-jobs/{id}: the raw
            # exception text must not survive into it.
            self.assertNotIn("workflow blew up", job.error)
            self.assertEqual(job.error, "Analysis failed.")

    async def test_curated_failure_messages_are_preserved(self):
        """Operator guidance is still worth showing; only uncurated text is dropped."""
        await self._add_job("curated")
        guidance = "Ollama is unreachable. Start Ollama and verify OLLAMA_HOST."

        async def fail_with_guidance(**kwargs):
            raise UserFacingError(guidance)

        with patch.object(job_module.analysis_workflow_service, "create_analysis",
                          side_effect=fail_with_guidance):
            await analysis_job_service.process_job("curated")

        async with self.SessionLocal() as db:
            result = await db.execute(select(AnalysisJob).where(AnalysisJob.job_id == "curated"))
            job = result.scalars().first()
            self.assertEqual(job.status, "failed")
            self.assertEqual(job.error, guidance)

    async def test_unreachable_database_does_not_raise(self):
        """The drain runs from lifespan; raising there would break app shutdown."""
        def explode(*args, **kwargs):
            raise OSError("connection refused")

        with patch.object(job_module, "AsyncSessionLocal", explode):
            self.assertEqual(await analysis_job_service.drain_queued_jobs(), 0)


if __name__ == "__main__":
    unittest.main()


class ProviderReadyWaitTest(unittest.IsolatedAsyncioTestCase):
    """The drain must wait out a cold provider rather than abandon the backlog."""

    def setUp(self):
        # Patch the poll interval rather than asyncio.sleep, which is global.
        self._poll = patch.object(job_module, "PROVIDER_READY_POLL_SECONDS", 0)
        self._poll.start()
        self.addCleanup(self._poll.stop)

    async def test_retries_until_the_provider_comes_up(self):
        attempts = []

        async def ready_on_third_try():
            attempts.append(1)
            return len(attempts) >= 3

        with patch.object(analysis_job_service, "_provider_is_ready", side_effect=ready_on_third_try):
            self.assertTrue(await analysis_job_service._await_provider_ready())

        self.assertEqual(len(attempts), 3)

    async def test_gives_up_once_the_deadline_passes(self):
        attempts = []

        async def never_ready():
            attempts.append(1)
            return False

        # monotonic: first call sets the deadline, later calls are past it
        ticks = iter([0.0] + [1e9] * 10)
        with patch.object(analysis_job_service, "_provider_is_ready", side_effect=never_ready):
            with patch.object(job_module.time, "monotonic", side_effect=lambda: next(ticks)):
                self.assertFalse(await analysis_job_service._await_provider_ready())

        self.assertEqual(len(attempts), 1, "should not keep polling past the deadline")


if __name__ == "__main__":
    unittest.main()
