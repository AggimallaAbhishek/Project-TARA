import logging
from contextlib import asynccontextmanager
from pathlib import Path

from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app import models  # noqa: F401
from app.config import get_settings
from app.database import Base, engine
from app.routes import analysis, audit, auth, comparison, diagram, document

# Configure logging before anything else
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

settings = get_settings()
logger = logging.getLogger(__name__)

DEFAULT_SECRET_KEY = "change-me-in-production"
BACKEND_ROOT = Path(__file__).resolve().parents[1]
ALEMBIC_INI_PATH = BACKEND_ROOT / "alembic.ini"

if settings.is_production and settings.secret_key == DEFAULT_SECRET_KEY:
    raise RuntimeError("SECRET_KEY must be configured in production")


def _build_alembic_config() -> Config:
    config = Config(str(ALEMBIC_INI_PATH))
    config.set_main_option("sqlalchemy.url", settings.database_url)
    return config


def verify_database_migrations_current() -> bool:
    """Fail if the connected database is not at the repository Alembic head."""
    config = _build_alembic_config()
    script = ScriptDirectory.from_config(config)
    expected_heads = set(script.get_heads())

    with engine.connect() as connection:
        migration_context = MigrationContext.configure(connection)
        current_heads = set(migration_context.get_current_heads())

    if current_heads != expected_heads:
        current_display = ", ".join(sorted(current_heads)) if current_heads else "none"
        expected_display = ", ".join(sorted(expected_heads)) if expected_heads else "none"
        raise RuntimeError(
            "Database schema is not migrated to Alembic head "
            f"(current={current_display}, expected={expected_display}). "
            "Run `alembic upgrade head` before starting production."
        )

    logger.info("DB migration verification success heads=%s", sorted(expected_heads))
    return True


def initialize_database_for_startup() -> bool:
    """Validate or initialize database tables during app startup."""
    if settings.is_production:
        logger.info("DB migration verification attempt (mode=production)")
        try:
            return verify_database_migrations_current()
        except Exception:
            logger.exception("DB migration verification failed (mode=production)")
            raise

    strict_startup = settings.is_db_startup_strict
    mode = "fail-fast" if strict_startup else "degraded"
    logger.info("DB local init attempt (mode=%s)", mode)

    try:
        Base.metadata.create_all(bind=engine)
    except Exception as exc:
        if strict_startup:
            logger.exception("DB local init failed (mode=%s)", mode)
            raise
        logger.warning(
            "DB local init failed (mode=%s). Continuing in degraded mode. error=%s",
            mode,
            str(exc),
        )
        return False

    logger.info("DB local init success")
    return True


@asynccontextmanager
async def lifespan(application: FastAPI):
    application.state.db_startup_ready = initialize_database_for_startup()
    yield


app = FastAPI(
    title=settings.app_name,
    description="AI-powered Threat Analysis and Risk Assessment using STRIDE methodology",
    version="1.0.0",
    lifespan=lifespan,
)

# CSRF protection strategy:
# - Primary: JWT cookie has SameSite=Lax, blocking cross-origin POST requests
# - Secondary: CORS middleware restricts allowed origins
# - Note: For production, ensure SameSite=Lax or Strict and Secure=True on cookies
# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(analysis.router, prefix="/api", tags=["Analysis"])
app.include_router(diagram.router, prefix="/api", tags=["Diagram"])
app.include_router(document.router, prefix="/api", tags=["Document"])
app.include_router(audit.router, prefix="/api", tags=["Audit"])
app.include_router(comparison.router, prefix="/api", tags=["Comparison"])


@app.get("/")
async def root():
    return {
        "message": "Welcome to TARA - Threat Analysis & Risk Assessment API",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check(request: Request):
    db_status = "healthy"
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:
        logger.exception("Health check failed: database unavailable")
        db_status = "unhealthy"

    overall_status = "healthy" if db_status == "healthy" else "degraded"

    # Only expose detailed service info to authenticated requests
    has_auth = bool(
        request.headers.get("Authorization")
        or request.cookies.get("tara_access_token")
    )
    if not has_auth:
        return {"status": overall_status}

    # Detailed check for authenticated consumers
    redis_status = "unavailable"
    try:
        from app.services.redis_service import redis_service
        redis_status = redis_service.health_check()
    except Exception:
        logger.debug("Redis health check failed")

    return {
        "status": overall_status,
        "service": settings.app_name,
        "checks": {
            "database": db_status,
            "redis": redis_status,
        },
    }
