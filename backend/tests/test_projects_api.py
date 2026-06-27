import os
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_async_db, get_db
from app.main import app
from app.models.analysis import Analysis
from app.models.audit import AuditLog
from app.models.project import Project
from app.models.user import User
from app.services.auth_service import get_current_user
from app.services.llm_service import llm_service
from app.services.rate_limit_service import analyze_rate_limiter


@pytest.fixture()
def project_client():
    temp_db_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    temp_db_file.close()
    db_url = f"sqlite:///{temp_db_file.name}"
    async_db_url = f"sqlite+aiosqlite:///{temp_db_file.name}"

    # Sync engine (for direct DB access in tests)
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    # Async engine (used by all FastAPI route handlers via get_async_db)
    async_engine = create_async_engine(async_db_url, connect_args={"check_same_thread": False})
    async_session_local = async_sessionmaker(
        bind=async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    db = session_local()
    user = User(
        email="projects-user@example.com",
        name="Projects User",
        google_id="projects-google-id",
    )
    other_user = User(
        email="projects-other@example.com",
        name="Other User",
        google_id="projects-other-google-id",
    )
    db.add_all([user, other_user])
    db.commit()
    db.refresh(user)
    db.refresh(other_user)
    user_id = user.id
    other_user_id = other_user.id
    db.close()

    def override_get_db():
        db_session = session_local()
        try:
            yield db_session
        finally:
            db_session.close()

    async def override_get_async_db():
        """Override the async DB dependency to use the isolated SQLite test DB."""
        async with async_session_local() as session:
            yield session

    def override_get_current_user():
        return User(
            id=user_id,
            email="projects-user@example.com",
            name="Projects User",
            google_id="projects-google-id",
        )

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_async_db] = override_get_async_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    client = TestClient(app)
    try:
        yield client, session_local, user_id, other_user_id
    finally:
        analyze_rate_limiter.clear()
        app.dependency_overrides.clear()
        client.close()
        engine.dispose()
        import asyncio
        asyncio.run(async_engine.dispose())
        os.unlink(temp_db_file.name)


def test_project_crud_and_activity(project_client):
    client, _session_local, _user_id, _other_user_id = project_client

    created = client.post(
        "/api/projects",
        json={"name": "Banking Mobile App", "description": "Consumer banking workspace"},
    )
    assert created.status_code == 201
    project_payload = created.json()
    project_id = project_payload["id"]
    assert project_payload["name"] == "Banking Mobile App"
    assert project_payload["analysis_count"] == 0

    duplicate = client.post("/api/projects", json={"name": " banking   mobile app "})
    assert duplicate.status_code == 409

    updated = client.patch(
        f"/api/projects/{project_id}",
        json={"name": "Banking App", "description": "Updated description"},
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Banking App"

    listed = client.get("/api/projects")
    assert listed.status_code == 200
    assert listed.json()["total"] == 1
    assert listed.json()["items"][0]["name"] == "Banking App"

    activity = client.get(f"/api/projects/{project_id}/activity")
    assert activity.status_code == 200
    actions = [entry["action"] for entry in activity.json()]
    assert "project_created" in actions
    assert "project_updated" in actions


def test_project_description_can_be_cleared(project_client):
    client, _session_local, _user_id, _other_user_id = project_client

    created = client.post(
        "/api/projects",
        json={"name": "Description Reset", "description": "Temporary notes"},
    )
    assert created.status_code == 201
    project_id = created.json()["id"]

    unchanged = client.patch(f"/api/projects/{project_id}", json={"name": "Description Reset Renamed"})
    assert unchanged.status_code == 200
    assert unchanged.json()["description"] == "Temporary notes"

    cleared_with_null = client.patch(f"/api/projects/{project_id}", json={"description": None})
    assert cleared_with_null.status_code == 200
    assert cleared_with_null.json()["description"] is None

    restored = client.patch(f"/api/projects/{project_id}", json={"description": "New notes"})
    assert restored.status_code == 200
    assert restored.json()["description"] == "New notes"

    cleared_with_blank = client.patch(f"/api/projects/{project_id}", json={"description": "   "})
    assert cleared_with_blank.status_code == 200
    assert cleared_with_blank.json()["description"] is None


def test_project_ownership_returns_404(project_client):
    client, session_local, _user_id, other_user_id = project_client
    db = session_local()
    other_project = Project(
        user_id=other_user_id,
        name="Other Project",
        normalized_name="other project",
    )
    db.add(other_project)
    db.commit()
    other_project_id = other_project.id
    db.close()

    response = client.get(f"/api/projects/{other_project_id}")
    assert response.status_code == 404

    patch_response = client.patch(f"/api/projects/{other_project_id}", json={"name": "Nope"})
    assert patch_response.status_code == 404


def test_analysis_creation_with_project_and_fallback_grouping(project_client):
    client, session_local, user_id, _other_user_id = project_client

    async def fake_analyze_system(
        _system_description: str,
        *,
        source_context: dict | None = None,
    ):
        return (
            [
                {
                    "name": "Session spoofing",
                    "description": "Attacker can reuse weak tokens.",
                    "stride_category": "Spoofing",
                    "affected_component": "Auth Gateway",
                    "likelihood": 4,
                    "impact": 4,
                    "mitigation": "Rotate tokens and enforce short TTL.",
                }
            ],
            0.1,
        )

    original_analyze_system = llm_service.analyze_system
    llm_service.analyze_system = fake_analyze_system
    try:
        project_response = client.post("/api/projects", json={"name": "Payment Platform"})
        assert project_response.status_code == 201
        project_id = project_response.json()["id"]

        explicit = client.post(
            "/api/analyze",
            json={
                "project_id": project_id,
                "title": "Payment Platform v1",
                "system_description": "Gateway, auth service, payment API, and database.",
            },
        )
        assert explicit.status_code == 201
        assert explicit.json()["project_id"] == project_id

        fallback = client.post(
            "/api/analyze",
            json={
                "title": "Payment Platform",
                "system_description": "Gateway, auth service, payment API, and database update.",
            },
        )
        assert fallback.status_code == 201
        assert fallback.json()["project_id"] == project_id
    finally:
        llm_service.analyze_system = original_analyze_system

    db = session_local()
    try:
        assert db.query(Project).filter(Project.user_id == user_id).count() == 1
        assert db.query(Analysis).filter(Analysis.project_id == project_id).count() == 2
        project_activity = db.query(AuditLog).filter(AuditLog.project_id == project_id).all()
        assert {event.action for event in project_activity} >= {"project_created", "analysis_created"}
    finally:
        db.close()
