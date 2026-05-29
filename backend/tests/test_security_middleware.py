from fastapi.testclient import TestClient

from app.main import app
from app.services.auth_service import ACCESS_TOKEN_COOKIE_NAME, CSRF_COOKIE_NAME, CSRF_HEADER_NAME


def test_csrf_rejects_cookie_authenticated_mutation_without_header():
    client = TestClient(app)
    client.cookies.set(ACCESS_TOKEN_COOKIE_NAME, "access-token")

    response = client.post("/api/auth/logout")

    assert response.status_code == 403
    assert response.json()["detail"] == "CSRF validation failed"


def test_csrf_rejects_mismatched_double_submit_token():
    client = TestClient(app)
    client.cookies.set(ACCESS_TOKEN_COOKIE_NAME, "access-token")
    client.cookies.set(CSRF_COOKIE_NAME, "cookie-token")

    response = client.post("/api/auth/logout", headers={CSRF_HEADER_NAME: "header-token"})

    assert response.status_code == 403


def test_csrf_allows_matching_double_submit_token():
    client = TestClient(app)
    client.cookies.set(ACCESS_TOKEN_COOKIE_NAME, "access-token")
    client.cookies.set(CSRF_COOKIE_NAME, "same-token")

    response = client.post("/api/auth/logout", headers={CSRF_HEADER_NAME: "same-token"})

    assert response.status_code == 200
    assert response.json()["message"] == "Logged out successfully"


def test_csrf_allows_bearer_authenticated_mutation_without_cookie_token():
    client = TestClient(app)
    client.cookies.set(ACCESS_TOKEN_COOKIE_NAME, "access-token")

    response = client.post("/api/auth/logout", headers={"Authorization": "Bearer api-token"})

    assert response.status_code == 200


def test_google_login_is_csrf_exempt():
    client = TestClient(app)
    client.cookies.set(ACCESS_TOKEN_COOKIE_NAME, "access-token")

    response = client.post("/api/auth/google", json={})

    assert response.status_code != 403


def test_security_headers_are_added_to_responses():
    client = TestClient(app)

    response = client.get("/")

    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "no-referrer"
    assert response.headers["Permissions-Policy"] == "camera=(), microphone=(), geolocation=()"
