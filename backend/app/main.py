import logging
from contextlib import asynccontextmanager

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

if settings.is_production and settings.secret_key == DEFAULT_SECRET_KEY:
    raise RuntimeError("SECRET_KEY must be configured in production")

def initialize_database_for_startup() -> bool:
    """Initialize database tables during app startup."""
    strict_startup = settings.is_db_startup_strict
    mode = "fail-fast" if strict_startup else "degraded"
    logger.info("DB init attempt (mode=%s)", mode)

    try:
        Base.metadata.create_all(bind=engine)
    except Exception:
        logger.exception("DB init failed (mode=%s)", mode)
        if strict_startup:
            raise
        return False

    logger.info("DB init success")
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
