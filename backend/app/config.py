from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_name: str = "TARA - Threat Analysis & Risk Assessment"
    ollama_model: str = "llama3.2"
    ollama_temperature: float = 0.1
    ollama_num_predict: int = 2048
    ollama_num_ctx: int = 4096
    ollama_request_timeout_seconds: int = 120
    ollama_keep_alive: str = "10m"
    ollama_retry_on_invalid_response: bool = True
    ollama_retry_num_predict: int = 4096
    ollama_enable_cache: bool = True
    ollama_cache_ttl_seconds: int = 600
    ollama_cache_max_entries: int = 128
    ollama_vision_model: str = ""
    database_url: str = "postgresql+psycopg2://tara:tara@localhost:5432/tara"
    database_pool_size: int = 5
    database_max_overflow: int = 10
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    allowed_origin_regex: str = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Google OAuth
    google_client_id: str = ""
    # Legacy compatibility: accepted for older .env files, not used by auth flow.
    google_client_secret: str = ""

    # JWT
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours

    # SMTP Email Notifications
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_use_tls: bool = True
    email_notifications_enabled: bool = False
    frontend_url: str = "http://localhost:5173"
    diagram_max_upload_mb: int = 10
    diagram_pdf_max_pages: int = 3
    diagram_extract_ttl_seconds: int = 1800
    db_startup_strict: bool | None = None

    model_config = SettingsConfigDict(env_file=".env")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def cors_origin_regex(self) -> str | None:
        if self.is_production:
            return None
        return self.allowed_origin_regex

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def is_db_startup_strict(self) -> bool:
        if self.db_startup_strict is not None:
            return self.db_startup_strict
        return self.is_production


@lru_cache()
def get_settings() -> Settings:
    return Settings()
