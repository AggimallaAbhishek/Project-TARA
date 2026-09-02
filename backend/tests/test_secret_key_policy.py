"""Production must reject weak JWT signing keys, not just the default one."""
import importlib
import pathlib
import sys

import pytest

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


@pytest.fixture(autouse=True)
def restore_app_main():
    """Reload app.main back to its real config after each case.

    These tests reload the module under a forced APP_ENV; without restoring it,
    a filtered or early-failing run would leave `app.main.settings.is_production`
    True for every test module that runs afterwards.
    """
    yield
    from app.config import get_settings

    get_settings.cache_clear()
    import app.main as m

    importlib.reload(m)
    get_settings.cache_clear()


def _reload_main_with(monkeypatch, *, app_env, secret_key):
    from app.config import get_settings

    monkeypatch.setenv("APP_ENV", app_env)
    monkeypatch.setenv("SECRET_KEY", secret_key)
    get_settings.cache_clear()
    try:
        import app.main as m

        return importlib.reload(m)
    finally:
        get_settings.cache_clear()


def test_production_rejects_the_default_secret(monkeypatch):
    with pytest.raises(RuntimeError, match="must be configured in production"):
        _reload_main_with(monkeypatch, app_env="production",
                          secret_key="change-me-in-production")


def test_production_rejects_a_short_secret(monkeypatch):
    """HS256 with a sub-32-byte key is below RFC 7518 3.2."""
    with pytest.raises(RuntimeError, match="at least 32 bytes"):
        _reload_main_with(monkeypatch, app_env="production", secret_key="short-but-not-default")


def test_production_accepts_a_strong_secret(monkeypatch):
    module = _reload_main_with(monkeypatch, app_env="production", secret_key="x" * 32)
    assert module.app is not None


def test_development_is_not_blocked_by_the_policy(monkeypatch):
    """Local dev must keep working without ceremony."""
    module = _reload_main_with(monkeypatch, app_env="development",
                               secret_key="change-me-in-production")
    assert module.app is not None
