import pathlib
import sys
import unittest
from unittest.mock import patch

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.database import Base
from app.models.audit import AuditLog
from app.models.user import User
from app.services.audit_service import audit_service


class AuditServiceTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        self.SessionLocal = async_sessionmaker(
            bind=self.engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
        self.db = self.SessionLocal()

        self.user = User(
            email="audit-session@example.com",
            name="Audit Session",
            google_id="audit-session-google-id",
        )
        self.db.add(self.user)
        await self.db.commit()
        await self.db.refresh(self.user)

    async def asyncTearDown(self):
        await self.db.close()
        await self.engine.dispose()

    async def test_records_event(self):
        event = await audit_service.record_event(
            self.db,
            user_id=self.user.id,
            action="analysis_created",
            analysis_id=123,
        )
        await self.db.commit()

        self.assertIsNotNone(event.id)
        count = await self.db.execute(select(func.count()).select_from(AuditLog))
        self.assertEqual(count.scalar(), 1)

    async def test_audit_failure_does_not_poison_parent_transaction(self):
        """A failed audit write must not take the caller's transaction with it."""
        original_flush = self.db.flush
        flush_calls = {"count": 0}

        async def fail_first_flush(*args, **kwargs):
            flush_calls["count"] += 1
            if flush_calls["count"] == 1:
                raise RuntimeError("forced audit flush failure")
            return await original_flush(*args, **kwargs)

        with patch.object(self.db, "flush", side_effect=fail_first_flush):
            await audit_service.record_event(
                self.db,
                user_id=self.user.id,
                action="analysis_created",
                analysis_id=123,
            )
            self.user.name = "Audit Session Updated"
            await self.db.commit()

        result = await self.db.execute(select(User).where(User.id == self.user.id))
        updated_user = result.scalars().first()
        self.assertIsNotNone(updated_user)
        self.assertEqual(updated_user.name, "Audit Session Updated")

        count = await self.db.execute(select(func.count()).select_from(AuditLog))
        self.assertEqual(count.scalar(), 0)


if __name__ == "__main__":
    unittest.main()
