"""Bounded reads for user-supplied uploads."""

import logging
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

logger = logging.getLogger(__name__)

# Large enough to keep syscall overhead low, small enough that the overshoot
# past the cap before we abort stays negligible.
CHUNK_SIZE = 64 * 1024

# Multipart bodies carry boundary markers and per-part headers on top of the
# file itself. Allow for that so a file at exactly the cap is not rejected by
# the Content-Length fast path before the real check runs.
MULTIPART_OVERHEAD_ALLOWANCE = 1024 * 1024


def _too_large(max_bytes: int) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
        detail=f"File is too large. Maximum allowed size is {max_bytes // (1024 * 1024)} MB.",
    )


def _exceeds_declared_length(content_length: str | None, max_bytes: int) -> bool:
    """Is the declared Content-Length already over the cap?

    The header is client-supplied and may be absent or malformed, so a False
    here means "keep going and meter the bytes", never "this is safe". A body
    carrying multipart framing overhead can exceed the cap while its file part
    does not, hence the allowance.
    """
    if content_length is None:
        return False
    try:
        declared = int(content_length)
    except (TypeError, ValueError):
        return False
    return declared > max_bytes + MULTIPART_OVERHEAD_ALLOWANCE


async def read_upload_capped(file: UploadFile, max_bytes: int) -> bytes:
    """Read an upload into memory, aborting as soon as it exceeds ``max_bytes``.

    MaxUploadSizeMiddleware is what stops an oversized request being accepted at
    all; by the time a handler runs the body is already parsed and spooled. This
    remains as defence in depth, bounding the memory used to pull a spooled part
    back in should a route ever be added without a middleware limit.
    """
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(CHUNK_SIZE)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            logger.warning(
                "Upload rejected over size cap file_name=%s max_bytes=%s",
                file.filename,
                max_bytes,
            )
            raise _too_large(max_bytes)
        chunks.append(chunk)
    return b"".join(chunks)


async def stream_upload_to_path(file: UploadFile, destination: Path, max_bytes: int) -> int:
    """Stream an upload to ``destination``, aborting if it exceeds ``max_bytes``.

    Returns the number of bytes written. A partially written file is removed on
    rejection so an oversized upload leaves nothing behind.
    """
    total = 0
    completed = False
    try:
        with destination.open("wb") as handle:
            while True:
                chunk = await file.read(CHUNK_SIZE)
                if not chunk:
                    break
                total += len(chunk)
                if total > max_bytes:
                    raise _too_large(max_bytes)
                handle.write(chunk)
        completed = True
    finally:
        # finally, not `except Exception`: CancelledError is a BaseException, and
        # a partial file left by a cancelled request has no job row to clean it
        # up later.
        if not completed:
            destination.unlink(missing_ok=True)
    return total


class MaxUploadSizeMiddleware:
    """Reject oversized request bodies before the multipart parser consumes them.

    Handler-level checks are too late: FastAPI resolves ``UploadFile`` by
    calling ``request.form()``, so Starlette has already parsed the body and
    spooled every part to a temp file before the endpoint runs. Verified by
    observing ``SpooledTemporaryFile._rolled`` being True on entry. A cap in the
    handler therefore bounds memory but not what the server accepts to disk.

    This runs as raw ASGI middleware so it sees the body before anything else:
    it rejects on a declared Content-Length, and also meters the streamed bytes
    so a chunked request with no Content-Length cannot slip past.
    """

    def __init__(self, app, path_limits: dict[str, int], default_limit: int | None = None):
        self.app = app
        # longest prefix first so a more specific rule wins
        self.path_limits = sorted(path_limits.items(), key=lambda kv: len(kv[0]), reverse=True)
        self.default_limit = default_limit

    def _limit_for(self, path: str) -> int | None:
        for prefix, limit in self.path_limits:
            if path.startswith(prefix):
                return limit
        return self.default_limit

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] not in {"POST", "PUT", "PATCH"}:
            await self.app(scope, receive, send)
            return

        max_bytes = self._limit_for(scope.get("path", ""))
        if max_bytes is None:
            await self.app(scope, receive, send)
            return

        headers = {k.decode("latin-1").lower(): v.decode("latin-1") for k, v in scope.get("headers", [])}
        if _exceeds_declared_length(headers.get("content-length"), max_bytes):
            logger.warning(
                "Upload rejected on Content-Length path=%s max_bytes=%s",
                scope.get("path"),
                max_bytes,
            )
            await self._send_too_large(send, max_bytes)
            return

        received = 0
        exceeded = False
        response_started = False

        async def metered_receive():
            nonlocal received, exceeded
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > max_bytes + MULTIPART_OVERHEAD_ALLOWANCE:
                    exceeded = True
                    # Cut the parser off rather than hand it more of the body.
                    # Its resulting error response is replaced below with a 413.
                    return {"type": "http.disconnect"}
            return message

        async def guarded_send(message):
            nonlocal response_started
            if exceeded:
                # The app is about to report a parse failure for a body we
                # truncated; answer with the real reason instead.
                if message["type"] == "http.response.start" and not response_started:
                    response_started = True
                    await self._send_too_large(send, max_bytes)
                return
            await send(message)

        await self.app(scope, metered_receive, guarded_send)
        if exceeded:
            logger.warning(
                "Upload exceeded size cap mid-stream path=%s max_bytes=%s",
                scope.get("path"),
                max_bytes,
            )
            if not response_started:
                await self._send_too_large(send, max_bytes)

    @staticmethod
    async def _send_too_large(send, max_bytes: int) -> None:
        import json

        payload = json.dumps(
            {"detail": f"File is too large. Maximum allowed size is {max_bytes // (1024 * 1024)} MB."}
        ).encode()
        await send({
            "type": "http.response.start",
            "status": 413,
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(payload)).encode()),
            ],
        })
        await send({"type": "http.response.body", "body": payload})
