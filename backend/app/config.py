from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_name: str = "TARA - Threat Analysis & Risk Assessment"
    ollama_model: str = "llama3.2"
    ollama_temperature: float = 0.1
    ollama_num_predict: int = 768
    ollama_num_ctx: int = 4096
    ollama_request_timeout_seconds: int = 120
    ollama_keep_alive: str = "10m"
    ollama_enable_cache: bool = True
    ollama_cache_ttl_seconds: int = 600
    ollama_cache_max_entries: int = 128
    database_url: str = "sqlite:///./tara.db"
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    allowed_origin_regex: str = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"

    # Google OAuth
    google_client_id: str = ""
    # Legacy compatibility: accepted for older .env files, not used by auth flow.
    google_client_secret: str = ""

    # JWT
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours

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


@lru_cache()
def get_settings() -> Settings:
    return Settings()
