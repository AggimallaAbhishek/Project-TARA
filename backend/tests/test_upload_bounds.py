"""Uploads must be capped while streaming, not after the whole body is buffered."""
import pathlib
import sys

import pytest
from fastapi import HTTPException

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.utils.uploads import CHUNK_SIZE, read_upload_capped, stream_upload_to_path


class CountingUpload:
    """An UploadFile stand-in that reports how much was actually pulled."""

    def __init__(self, total_size: int, filename: str = "big.bin"):
        self.total_size = total_size
        self.filename = filename
        self.bytes_served = 0

    async def read(self, size: int = -1) -> bytes:
        remaining = self.total_size - self.bytes_served
        if remaining <= 0:
            return b""
        n = remaining if size == -1 else min(size, remaining)
        self.bytes_served += n
        return b"x" * n


def test_read_stops_early_instead_of_buffering_the_whole_body():
    import asyncio

    max_bytes = 1 * 1024 * 1024
    upload = CountingUpload(total_size=200 * 1024 * 1024)   # 200 MB body, 1 MB cap

    with pytest.raises(HTTPException) as exc:
        asyncio.run(read_upload_capped(upload, max_bytes))

    assert exc.value.status_code == 413
    # the whole point: we must not have pulled anywhere near 200 MB
    assert upload.bytes_served <= max_bytes + CHUNK_SIZE, upload.bytes_served


def test_read_returns_a_file_at_exactly_the_cap():
    import asyncio

    max_bytes = 256 * 1024
    upload = CountingUpload(total_size=max_bytes)
    data = asyncio.run(read_upload_capped(upload, max_bytes))
    assert len(data) == max_bytes


def test_streaming_to_disk_stops_early_and_leaves_no_partial_file(tmp_path):
    import asyncio

    max_bytes = 1 * 1024 * 1024
    destination = tmp_path / "staged.bin"
    upload = CountingUpload(total_size=200 * 1024 * 1024)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(stream_upload_to_path(upload, destination, max_bytes))

    assert exc.value.status_code == 413
    assert upload.bytes_served <= max_bytes + CHUNK_SIZE, upload.bytes_served
    assert not destination.exists(), "a rejected upload left a partial file behind"


def test_streaming_to_disk_writes_a_file_within_the_cap(tmp_path):
    import asyncio

    destination = tmp_path / "staged.bin"
    upload = CountingUpload(total_size=100 * 1024)
    written = asyncio.run(stream_upload_to_path(upload, destination, 1 * 1024 * 1024))

    assert written == 100 * 1024
    assert destination.stat().st_size == 100 * 1024
