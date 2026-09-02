"""Both in-memory fallbacks must release entries instead of growing forever."""
import pathlib
import sys

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.services.extract_session_service import InMemoryExtractSessionStore
from app.services.rate_limit_service import InMemoryRateLimiter


def test_rate_limiter_releases_keys_whose_window_drained():
    clock = [1000.0]
    limiter = InMemoryRateLimiter(max_requests=5, window_seconds=60, now_fn=lambda: clock[0])

    for i in range(500):
        assert limiter.is_allowed(f"ip:{i}")[0] is True
    assert len(limiter._buckets) == 500

    # every window has drained; the next call sweeps them
    clock[0] += 61
    limiter.is_allowed("ip:new")
    assert len(limiter._buckets) == 1, "drained buckets were retained"


def test_rate_limiter_sweep_keeps_live_windows_and_still_limits():
    clock = [1000.0]
    limiter = InMemoryRateLimiter(max_requests=2, window_seconds=60, now_fn=lambda: clock[0])

    assert limiter.is_allowed("live")[0] is True
    clock[0] += 61                      # triggers a sweep on the next call
    assert limiter.is_allowed("live")[0] is True
    assert limiter.is_allowed("live")[0] is True
    # a live key must survive its own sweep and still block at the cap
    allowed, retry_after = limiter.is_allowed("live")
    assert allowed is False
    assert retry_after > 0


def test_extract_sessions_purge_on_create_not_only_on_read():
    clock = [1000.0]
    store = InMemoryExtractSessionStore(ttl_seconds=1800, now_fn=lambda: clock[0])

    abandoned = [store.create({"user_id": 1, "diagram_code": "x" * 1000}) for _ in range(100)]
    assert len(store._entries) == 100

    clock[0] += 1801                    # all abandoned entries are now expired
    fresh = store.create({"user_id": 2})

    assert len(store._entries) == 1, "expired sessions were retained"
    assert store.get(fresh) is not None
    assert all(store.get(k) is None for k in abandoned)
