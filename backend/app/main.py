import asyncio
import logging
import secrets
from contextlib import asynccontextmanager
from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import inspect as sa_inspect
from sqlalchemy import text
from app import models  # noqa: F401
from app.config import get_settings
from app.database import engine
from app.routes import analysis, audit, auth, comparison, diagram, document, projects
from app.models.user import User
from app.services.auth_service import (
    ACCESS_TOKEN_COOKIE_NAME,
    CSRF_COOKIE_NAME,
    CSRF_HEADER_NAME,
    get_current_user,
)
from app.services.analysis_job_service import analysis_job_service
from app.utils.uploads import MaxUploadSizeMiddleware

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
CSRF_PROTECTED_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
CSRF_EXEMPT_PATHS = {"/api/auth/google"}
JOB_DRAIN_SHUTDOWN_TIMEOUT = 10.0

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


def _run_alembic_upgrade_head() -> None:
    config = _build_alembic_config()
    command.upgrade(config, "head")


def _get_user_table_names() -> set[str]:
    with engine.connect() as connection:
        inspector = sa_inspect(connection)
        return {
            table_name
            for table_name in inspector.get_table_names()
            if not table_name.startswith("sqlite_")
        }


def initialize_database_for_startup() -> bool:
    """Validate database migration state during app startup."""
    if settings.is_production:
        logger.info("DB migration verification attempt (mode=production)")
        try:
            return verify_database_migrations_current()
        except Exception:
            logger.exception("DB migration verification failed (mode=production)")
            raise

    logger.info("DB migration startup check (mode=development)")
    try:
        table_names = _get_user_table_names()
    except Exception:
        logger.exception("DB startup check failed while loading schema metadata")
        raise

    if not table_names:
        logger.info("DB startup state detected: empty schema; running alembic upgrade head")
        try:
            _run_alembic_upgrade_head()
        except Exception:
            logger.exception("DB startup migration failed for empty schema")
            raise
        verify_database_migrations_current()
        logger.info("DB startup migration success for empty schema")
        return True

    if "alembic_version" not in table_names:
        remediation = (
            "python backend/scripts/repair_schema_and_stamp.py "
            "(or from backend/: python scripts/repair_schema_and_stamp.py)"
        )
        logger.error(
            "DB startup state detected: non-empty schema without alembic_version table tables=%s",
            sorted(table_names),
        )
        raise RuntimeError(
            "Database schema exists but migration history is missing. "
            f"Run `{remediation}` and restart the backend."
        )

    logger.info(
        "DB startup state detected: migration-managed schema tables=%s; running alembic upgrade head",
        sorted(table_names),
    )
    try:
        _run_alembic_upgrade_head()
    except Exception:
        logger.exception("DB startup migration failed for existing schema")
        raise RuntimeError(
            "Could not apply database migrations automatically. "
            "If this database was created before Alembic tracking, run "
            "`python backend/scripts/repair_schema_and_stamp.py` "
            "(or from backend/: `python scripts/repair_schema_and_stamp.py`) and retry."
        )

    verify_database_migrations_current()
    logger.info("DB startup migration success for existing schema")
    return True


@asynccontextmanager
async def lifespan(application: FastAPI):
    application.state.db_startup_ready = initialize_database_for_startup()
    analysis_job_service.mark_interrupted_jobs_queued()

    # Requeued jobs have no dispatcher of their own — BackgroundTasks only runs
    # jobs created by a live request — so drain the backlog here. Kept off the
    # startup path so a slow LLM cannot hold up readiness.
    drain_task = asyncio.create_task(analysis_job_service.drain_queued_jobs())
    application.state.job_drain_task = drain_task
    try:
        yield
    finally:
        if not drain_task.done():
            drain_task.cancel()
        # asyncio.wait (not wait_for) so the drain task's own cancellation never
        # propagates here and cannot be confused with the lifespan task being
        # cancelled. process_job can be blocked in asyncio.to_thread(ollama.chat),
        # which cancellation cannot interrupt, so the wait is bounded: past the
        # timeout the thread is left to finish and shutdown proceeds.
        done, pending = await asyncio.wait({drain_task}, timeout=JOB_DRAIN_SHUTDOWN_TIMEOUT)
        if pending:
            logger.warning(
                "Analysis job drain did not stop within %ss; continuing shutdown",
                JOB_DRAIN_SHUTDOWN_TIMEOUT,
            )


app = FastAPI(
    title=settings.app_name,
    description="AI-powered Threat Analysis and Risk Assessment using STRIDE methodology",
    version="1.0.0",
    lifespan=lifespan,
)

# Reject oversized uploads before the multipart parser spools them to disk.
#
# Ordering (verified, not assumed): the LAST middleware added is the outermost,
# so this one - added before CORS below - runs *inside* CORS and immediately
# before routing. That is deliberate: a 413 emitted outside CORS would reach the
# browser as an opaque CORS failure rather than the real status. It still sees
# the body first, because nothing between here and the endpoint reads it.
#
# If you add another middleware that consumes the request body, add it BEFORE
# this line so it ends up inside this cap rather than outside it.
app.add_middleware(
    MaxUploadSizeMiddleware,
    path_limits={
        "/api/diagram/extract": settings.diagram_max_upload_mb * 1024 * 1024,
        "/api/document/analyze": settings.document_max_upload_mb * 1024 * 1024,
    },
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
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", CSRF_HEADER_NAME],
)


def _set_header_if_missing(response, name: str, value: str) -> None:
    if name not in response.headers:
        response.headers[name] = value


def _has_bearer_authorization(request: Request) -> bool:
    authorization = request.headers.get("Authorization", "")
    return authorization.lower().startswith("bearer ")


def _requires_csrf_validation(request: Request) -> bool:
    if request.method.upper() not in CSRF_PROTECTED_METHODS:
        return False
    if request.url.path in CSRF_EXEMPT_PATHS:
        return False
    if not request.url.path.startswith("/api"):
        return False
    if _has_bearer_authorization(request):
        return False
    return bool(request.cookies.get(ACCESS_TOKEN_COOKIE_NAME))


def _add_security_headers(response) -> None:
    _set_header_if_missing(response, "X-Content-Type-Options", "nosniff")
    _set_header_if_missing(response, "X-Frame-Options", "DENY")
    _set_header_if_missing(response, "Referrer-Policy", "no-referrer")
    _set_header_if_missing(
        response,
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()",
    )
    if settings.is_production:
        _set_header_if_missing(
            response,
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains",
        )


@app.middleware("http")
async def csrf_and_security_headers_middleware(request: Request, call_next):
    if _requires_csrf_validation(request):
        csrf_cookie = request.cookies.get(CSRF_COOKIE_NAME, "")
        csrf_header = request.headers.get(CSRF_HEADER_NAME, "")
        if not csrf_cookie or not csrf_header or not secrets.compare_digest(csrf_cookie, csrf_header):
            logger.warning(
                "CSRF validation failed method=%s path=%s has_cookie=%s has_header=%s",
                request.method,
                request.url.path,
                bool(csrf_cookie),
                bool(csrf_header),
            )
            response = JSONResponse(
                status_code=403,
                content={"detail": "CSRF validation failed"},
            )
            _add_security_headers(response)
            return response

    response = await call_next(request)
    _add_security_headers(response)
    return response


# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(analysis.router, prefix="/api", tags=["Analysis"])
app.include_router(diagram.router, prefix="/api", tags=["Diagram"])
app.include_router(document.router, prefix="/api", tags=["Document"])
app.include_router(audit.router, prefix="/api", tags=["Audit"])
app.include_router(comparison.router, prefix="/api", tags=["Comparison"])
app.include_router(projects.router, prefix="/api", tags=["Projects"])


@app.get("/")
async def root():
    return {
        "message": "Welcome to TARA - Threat Analysis & Risk Assessment API",
        "docs": "/docs",
        "health": "/health"
    }


def _check_database_sync() -> str:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return "healthy"
    except Exception:
        logger.exception("Health check failed: database unavailable")
        return "unhealthy"


async def _database_status() -> str:
    """Run the synchronous connectivity probe off the event loop."""
    return await asyncio.to_thread(_check_database_sync)


@app.get("/health")
async def health_check():
    """Public liveness probe.

    Deliberately shallow: it must be safe to expose to load balancers and
    anonymous callers, so it reveals only whether the service is serving.
    Component detail lives on /health/details behind authentication.
    """
    db_status = await _database_status()
    return {"status": "healthy" if db_status == "healthy" else "degraded"}


@app.get("/health/details")
async def health_details(current_user: User = Depends(get_current_user)):
    """Component-level health, for authenticated callers only.

    The previous version gated this on the mere *presence* of a cookie or
    Authorization header, which any anonymous caller can set, so database and
    Redis reachability was effectively public.
    """
    _ = current_user
    db_status = await _database_status()

    redis_status = "unavailable"
    try:
        from app.services.redis_service import redis_service

        redis_status = await asyncio.to_thread(redis_service.health_check)
    except Exception:
        logger.debug("Redis health check failed", exc_info=True)

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "service": settings.app_name,
        "checks": {
            "database": db_status,
            "redis": redis_status,
        },
    }
