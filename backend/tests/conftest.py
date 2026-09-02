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
def disable_rate_limits(request):
    """Disable rate limiters so incidental 429s do not break unrelated tests.

    Tests that exist to verify rate limiting itself must opt out with
    ``@pytest.mark.real_rate_limits``; without that escape hatch this fixture
    would guarantee they can never observe a 429.
    """
    if request.node.get_closest_marker("real_rate_limits"):
        # Exercise the real sliding-window limiter, but pin it to the in-memory
        # backend. HybridRateLimiter prefers Redis when it is reachable, and the
        # Redis path ignores both clear() and the injected now_fn - so with a
        # local Redis running these tests would leak state and fail.
        from unittest.mock import PropertyMock, patch
        with patch(
            "app.services.redis_service.RedisService.is_available",
            new_callable=PropertyMock,
            return_value=False,
        ):
            yield
        return

    from unittest.mock import patch
    with patch(
        "app.services.rate_limit_service.HybridRateLimiter.is_allowed",
        return_value=(True, 0)
    ):
        yield
