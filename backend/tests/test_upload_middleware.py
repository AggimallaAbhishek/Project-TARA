"""Oversized bodies must be rejected before the multipart parser spools them."""
import pathlib
import sys

from fastapi import FastAPI, File, UploadFile
from fastapi.testclient import TestClient

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.utils.uploads import MaxUploadSizeMiddleware

LIMIT = 1 * 1024 * 1024
BOUNDARY = "B"


def _build_app():
    app = FastAPI()
    app.state.reached = []
    app.add_middleware(MaxUploadSizeMiddleware, path_limits={"/upload": LIMIT})

    @app.post("/upload")
    async def upload(file: UploadFile = File(...)):
        app.state.reached.append(file.filename)
        return {"ok": True}

    @app.post("/other")
    async def other():
        app.state.reached.append("other")
        return {"ok": True}

    return app


def _multipart(size: int) -> bytes:
    head = (
        f'--{BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="f.bin"\r\n'
        f"Content-Type: application/octet-stream\r\n\r\n"
    ).encode()
    return head + b"x" * size + f"\r\n--{BOUNDARY}--\r\n".encode()


HEADERS = {"Content-Type": f"multipart/form-data; boundary={BOUNDARY}"}


def test_oversized_body_is_rejected_and_never_reaches_the_handler():
    app = _build_app()
    with TestClient(app) as client:
        response = client.post("/upload", content=_multipart(40 * 1024 * 1024), headers=HEADERS)

    assert response.status_code == 413
    assert "too large" in response.json()["detail"].lower()
    assert app.state.reached == [], "handler ran despite the body exceeding the cap"


def test_body_within_the_cap_is_delivered():
    app = _build_app()
    with TestClient(app) as client:
        response = client.post("/upload", content=_multipart(64 * 1024), headers=HEADERS)

    assert response.status_code == 200
    assert app.state.reached == ["f.bin"]


def test_unmetered_paths_are_untouched():
    app = _build_app()
    with TestClient(app) as client:
        assert client.post("/other").status_code == 200
    assert app.state.reached == ["other"]


def test_get_requests_are_untouched():
    app = _build_app()
    with TestClient(app) as client:
        assert client.get("/docs").status_code == 200


def _chunked_multipart(size: int):
    """Yield a multipart body in pieces so httpx sends it without Content-Length."""
    yield (
        f'--{BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="f.bin"\r\n'
        f"Content-Type: application/octet-stream\r\n\r\n"
    ).encode()
    sent = 0
    while sent < size:
        n = min(256 * 1024, size - sent)
        sent += n
        yield b"x" * n
    yield f"\r\n--{BOUNDARY}--\r\n".encode()


def test_chunked_oversized_upload_gets_413_not_a_parse_error():
    """No Content-Length to check, so the byte meter has to produce the 413."""
    app = _build_app()
    with TestClient(app) as client:
        response = client.post(
            "/upload", content=_chunked_multipart(40 * 1024 * 1024), headers=HEADERS
        )

    assert response.status_code == 413, response.status_code
    assert "too large" in response.json()["detail"].lower()
    assert app.state.reached == []


def test_chunked_upload_within_the_cap_still_works():
    app = _build_app()
    with TestClient(app) as client:
        response = client.post("/upload", content=_chunked_multipart(64 * 1024), headers=HEADERS)

    assert response.status_code == 200
    assert app.state.reached == ["f.bin"]
