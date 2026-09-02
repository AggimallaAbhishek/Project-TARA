"""Shared fixtures for TARA backend tests."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base


@pytest.fixture()
def db_session():
    """Create an in-memory SQLite database session for testing."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(autouse=True)
def force_in_memory_backends():
    """Run every test against the in-memory fallbacks, never a live Redis.

    The Redis-backed paths (rate limiter, extract sessions, threat cache) ignore
    the fake clocks these tests inject and carry state between runs, so a
    developer with Redis running would get different results from one who does
    not - and the failure looks like a logic bug rather than an environment
    difference. No test in this suite needs a real Redis.
    """
    from unittest.mock import PropertyMock, patch

    with patch(
        "app.services.redis_service.RedisService.is_available",
        new_callable=PropertyMock,
        return_value=False,
    ):
        yield


@pytest.fixture(autouse=True)
def disable_rate_limits(request):
    """Disable rate limiters so incidental 429s do not break unrelated tests.

    Tests that exist to verify rate limiting itself opt out with
    ``@pytest.mark.real_rate_limits``; without that escape hatch this fixture
    would guarantee they can never observe a 429. They still run against the
    in-memory limiter, pinned by :func:`force_in_memory_backends`.
    """
    if request.node.get_closest_marker("real_rate_limits"):
        yield
        return

    from unittest.mock import patch

    with patch(
        "app.services.rate_limit_service.HybridRateLimiter.is_allowed",
        return_value=(True, 0)
    ):
        yield
