"""Logout must clear the cookies login set, in every environment."""
import pathlib
import sys

import pytest
from fastapi import FastAPI, Response
from fastapi.testclient import TestClient

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.routes.auth import logout
from app.services import auth_service
from app.services.auth_service import (
    ACCESS_TOKEN_COOKIE_NAME,
    CSRF_COOKIE_NAME,
    auth_cookie_attrs,
)


def _logout_set_cookie_headers():
    app = FastAPI()
    app.post("/logout")(logout)
    with TestClient(app) as client:
        response = client.post("/logout")
    return response.headers.get_list("set-cookie")


def _attrs_of(header: str) -> set[str]:
    return {part.strip().lower() for part in header.split(";")[1:]}


@pytest.mark.parametrize(
    "app_env, expect_secure, expect_samesite",
    [("production", True, "samesite=none"), ("development", False, "samesite=lax")],
)
def test_logout_repeats_the_attributes_login_used(
    monkeypatch, app_env, expect_secure, expect_samesite
):
    """A browser only discards a cookie when the expiry carries matching attributes."""
    monkeypatch.setattr(auth_service.settings, "app_env", app_env, raising=False)
    get_settings = auth_service.get_settings
    get_settings.cache_clear()
    monkeypatch.setenv("APP_ENV", app_env)

    try:
        expected = auth_cookie_attrs(httponly=True)
        assert expected["secure"] is expect_secure

        headers = _logout_set_cookie_headers()
        assert len(headers) == 2

        by_name = {h.split("=")[0]: h for h in headers}
        assert ACCESS_TOKEN_COOKIE_NAME in by_name
        assert CSRF_COOKIE_NAME in by_name

        for name, header in by_name.items():
            attrs = _attrs_of(header)
            assert expect_samesite in attrs, (name, header)
            assert ("secure" in attrs) is expect_secure, (name, header)
            assert "path=/" in attrs, (name, header)
            # the access-token cookie is HttpOnly, the CSRF one deliberately is not
            assert ("httponly" in attrs) is (name == ACCESS_TOKEN_COOKIE_NAME), header
    finally:
        get_settings.cache_clear()
