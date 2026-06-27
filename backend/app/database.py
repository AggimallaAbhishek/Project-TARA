from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import get_settings

settings = get_settings()


def _build_engine_pool_kwargs(url: str) -> dict:
    """Return SQLAlchemy engine kwargs for pooling based on the DB URL scheme.

    SQLite does not support connection pooling options — only check_same_thread
    is required.  All other backends (PostgreSQL) get the configured pool
    settings from :class:`~app.config.Settings`.
    """
    if url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}}
    return {
        "pool_size": settings.database_pool_size,
        "max_overflow": settings.database_max_overflow,
        "pool_pre_ping": True,
    }


# ---------------------------------------------------------------------------
# Synchronous engine & session (used by Alembic migrations and startup checks)
# ---------------------------------------------------------------------------
engine = create_engine(settings.database_url, **_build_engine_pool_kwargs(settings.database_url))

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Async engine & session (used by FastAPI route handlers at runtime)
# ---------------------------------------------------------------------------

def _build_async_database_url(url: str) -> str:
    """Convert a synchronous database URL to its async equivalent.

    - ``postgresql://`` or ``postgresql+psycopg2://`` → ``postgresql+asyncpg://``
    - ``sqlite://`` → ``sqlite+aiosqlite://`` (for dev/test convenience)
    - Other schemes are returned unchanged.
    """
    if url.startswith("postgresql+psycopg2://"):
        return url.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("sqlite:///"):
        return url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
    return url


async_database_url = _build_async_database_url(settings.database_url)

# Re-use the same pool kwargs helper; aiosqlite has the same restriction as
# the sync SQLite driver so the helper returns the right dict for both.
async_engine = create_async_engine(
    async_database_url,
    **_build_engine_pool_kwargs(async_database_url),
)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_async_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
