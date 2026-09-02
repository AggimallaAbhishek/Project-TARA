"""Staged uploads hold user documents; the directory must be owner-only."""
import pathlib
import stat
import sys
from unittest.mock import patch

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.services.analysis_job_service import analysis_job_service


def _with_stage_dir(path):
    from app.services import analysis_job_service as mod
    settings = type("S", (), {"analysis_job_stage_dir": str(path)})()
    return patch.object(mod, "get_settings", return_value=settings)


def test_created_stage_dir_is_owner_only(tmp_path):
    target = tmp_path / "nested" / "analysis-jobs"
    with _with_stage_dir(target):
        root = analysis_job_service._stage_root()

    assert root.is_dir()
    assert stat.S_IMODE(root.stat().st_mode) == 0o700, oct(root.stat().st_mode)


def test_a_preexisting_loose_directory_is_tightened(tmp_path):
    """A dir left world-writable by an earlier run must not stay that way."""
    target = tmp_path / "analysis-jobs"
    target.mkdir(mode=0o777)
    target.chmod(0o777)
    assert stat.S_IMODE(target.stat().st_mode) == 0o777

    with _with_stage_dir(target):
        root = analysis_job_service._stage_root()

    assert stat.S_IMODE(root.stat().st_mode) == 0o700


def test_default_stage_dir_is_not_under_tmp():
    """Assert the code default, not whatever the developer's .env happens to say."""
    from app.config import Settings

    default = Settings(_env_file=None).analysis_job_stage_dir
    assert not default.startswith("/tmp"), default
    assert pathlib.Path(default).parts[-2:] == ("var", "analysis-jobs"), default


def test_a_directory_that_cannot_be_secured_is_refused(tmp_path, monkeypatch):
    """Fail closed: never stage user documents in a directory we can't lock down."""
    import pytest

    target = tmp_path / "analysis-jobs"
    target.mkdir(mode=0o777)
    target.chmod(0o777)

    def refuse_chmod(self, mode):
        raise PermissionError("operation not permitted")

    monkeypatch.setattr(pathlib.Path, "chmod", refuse_chmod)

    with _with_stage_dir(target):
        with pytest.raises(RuntimeError, match="Refusing to stage uploads"):
            analysis_job_service._stage_root()
