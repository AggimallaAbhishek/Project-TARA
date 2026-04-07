from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_name: str = "TARA - Threat Analysis & Risk Assessment"
    ollama_model: str = "qwen3-coder:480b-cloud"
    database_url: str = "sqlite:///./tara.db"
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Google OAuth
    google_client_id: str = ""

    # JWT
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours

    model_config = SettingsConfigDict(env_file=".env")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
