from unittest.mock import patch

from app.models.audit import AuditLog
from app.models.user import User
from app.services.audit_service import audit_service


def test_audit_failure_does_not_poison_parent_transaction(db_session):
    user = User(
        email="audit-session@example.com",
        name="Audit Session",
        google_id="audit-session-google-id",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    original_flush = db_session.flush
    flush_calls = {"count": 0}

    def fail_first_flush(*args, **kwargs):
        flush_calls["count"] += 1
        if flush_calls["count"] == 1:
            raise RuntimeError("forced audit flush failure")
        return original_flush(*args, **kwargs)

    with patch.object(db_session, "flush", side_effect=fail_first_flush):
        audit_service.record_event(
            db=db_session,
            user_id=user.id,
            action="analysis_created",
            analysis_id=123,
        )
        user.name = "Audit Session Updated"
        db_session.commit()

    updated_user = db_session.query(User).filter(User.id == user.id).first()
    assert updated_user is not None
    assert updated_user.name == "Audit Session Updated"
    assert db_session.query(AuditLog).count() == 0
