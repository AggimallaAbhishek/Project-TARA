from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
DEV_UP_SCRIPT = REPO_ROOT / "scripts" / "dev-up.sh"
RUNTIME_CHECK_SCRIPT = REPO_ROOT / "scripts" / "check-runtime-drift.sh"


def test_dev_up_rebuilds_frontend_image() -> None:
    script = DEV_UP_SCRIPT.read_text(encoding="utf-8")
    assert "docker compose up -d --build frontend" in script


def test_dev_up_runs_runtime_alignment_check() -> None:
    script = DEV_UP_SCRIPT.read_text(encoding="utf-8")
    assert "./scripts/check-runtime-drift.sh" in script


def test_runtime_drift_script_checks_images_bundles_and_health() -> None:
    script = RUNTIME_CHECK_SCRIPT.read_text(encoding="utf-8")
    assert 'assert_service_uses_latest_image "backend" "project-tara-backend:latest"' in script
    assert 'assert_service_uses_latest_image "frontend" "project-tara-frontend:latest"' in script
    assert "docker compose exec -T frontend" in script
    assert "assets/index-" in script
    assert "http://localhost:8000/health" in script
