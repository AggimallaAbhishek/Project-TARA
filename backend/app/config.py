from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "TARA - Threat Analysis & Risk Assessment"
    ollama_model: str = "qwen3-coder:480b-cloud"
    database_url: str = "sqlite:///./tara.db"
    
    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    
    # JWT
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours
    
    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
