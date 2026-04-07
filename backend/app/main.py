import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.config import get_settings
from app.database import Base, engine
from app.routes import analysis, auth

settings = get_settings()
logger = logging.getLogger(__name__)

DEFAULT_SECRET_KEY = "change-me-in-production"

if settings.is_production and settings.secret_key == DEFAULT_SECRET_KEY:
    raise RuntimeError("SECRET_KEY must be configured in production")

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.app_name,
    description="AI-powered Threat Analysis and Risk Assessment using STRIDE methodology",
    version="1.0.0"
)

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(analysis.router, prefix="/api", tags=["Analysis"])


@app.get("/")
async def root():
    return {
        "message": "Welcome to TARA - Threat Analysis & Risk Assessment API",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check():
    db_status = "healthy"
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:
        logger.exception("Health check failed: database unavailable")
        db_status = "unhealthy"

    overall_status = "healthy" if db_status == "healthy" else "degraded"
    return {
        "status": overall_status,
        "service": settings.app_name,
        "checks": {"database": db_status},
    }
