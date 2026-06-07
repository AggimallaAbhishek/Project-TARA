from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import get_settings

settings = get_settings()

# ---------------------------------------------------------------------------
# Synchronous engine & session (used by Alembic migrations and startup checks)
# ---------------------------------------------------------------------------
engine_kwargs = {}
if settings.database_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # PostgreSQL connection pooling
    engine_kwargs["pool_size"] = settings.database_pool_size
    engine_kwargs["max_overflow"] = settings.database_max_overflow
    engine_kwargs["pool_pre_ping"] = True

engine = create_engine(settings.database_url, **engine_kwargs)

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

async_engine_kwargs: dict = {}
if not async_database_url.startswith("sqlite"):
    async_engine_kwargs["pool_size"] = settings.database_pool_size
    async_engine_kwargs["max_overflow"] = settings.database_max_overflow
    async_engine_kwargs["pool_pre_ping"] = True

async_engine = create_async_engine(async_database_url, **async_engine_kwargs)

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
