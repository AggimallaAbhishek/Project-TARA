import asyncio
from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.models.analysis import Analysis, AnalysisJob, Threat
from app.models.audit import AuditLog
from app.models.project import Project
from app.models.user import User
from app.services import auth_service
from app.utils.time import utc_now_for_db


class _FakeScalarResult:
    def __init__(self, value):
        self.value = value

    def first(self):
        return self.value


class _FakeExecuteResult:
    def __init__(self, value):
        self.value = value

    def scalars(self):
        return _FakeScalarResult(self.value)


class _FakeAsyncSession:
    def __init__(self, user=None):
        self.user = user
        self.added = []
        self.commits = 0
        self.refreshed = []

    async def execute(self, _statement):
        return _FakeExecuteResult(self.user)

    def add(self, value):
        self.added.append(value)

    async def commit(self):
        self.commits += 1

    async def refresh(self, value):
        self.refreshed.append(value)
        if getattr(value, "id", None) is None:
            value.id = 1


def test_verify_google_token_hides_internal_validation_detail():
    with patch.object(auth_service.settings, "google_client_id", "client-id"), patch(
        "app.services.auth_service.id_token.verify_oauth2_token",
        side_effect=ValueError("clock skew too large"),
    ) as verify_mock:
        with pytest.raises(HTTPException) as exc_info:
            auth_service.verify_google_token("bad-token")

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid Google token"
    assert verify_mock.call_args.kwargs["clock_skew_in_seconds"] == 60


def test_utc_now_for_db_returns_naive_utc_datetime():
    before = datetime.now(timezone.utc).replace(tzinfo=None)

    value = utc_now_for_db()

    after = datetime.now(timezone.utc).replace(tzinfo=None)
    assert value.tzinfo is None
    assert before <= value <= after


@pytest.mark.parametrize(
    ("model", "column_names"),
    [
        (User, ("created_at", "last_login")),
        (Project, ("created_at", "updated_at")),
        (Analysis, ("created_at", "updated_at")),
        (Threat, ("created_at",)),
        (AnalysisJob, ("created_at", "updated_at")),
        (AuditLog, ("created_at",)),
    ],
)
def test_model_timestamp_defaults_are_db_safe_naive_utc(model, column_names):
    for column_name in column_names:
        column = model.__table__.columns[column_name]
        default_value = column.default.arg(None)
        assert default_value.tzinfo is None

        if column.onupdate is not None:
            update_value = column.onupdate.arg(None)
            assert update_value.tzinfo is None


def test_get_or_create_user_existing_user_sets_db_safe_last_login():
    user = User(
        id=7,
        email="existing@example.com",
        name="Existing User",
        google_id="google-existing",
        last_login=datetime(2026, 1, 1, 0, 0, 0),
    )
    db = _FakeAsyncSession(user=user)

    result = asyncio.run(
        auth_service.get_or_create_user(
            db,
            {
                "google_id": "google-existing",
                "email": "existing@example.com",
                "name": "Renamed User",
                "picture": "https://example.com/avatar.png",
            },
        )
    )

    assert result is user
    assert user.name == "Renamed User"
    assert user.picture == "https://example.com/avatar.png"
    assert user.last_login.tzinfo is None
    assert db.commits == 1
    assert db.refreshed == [user]
