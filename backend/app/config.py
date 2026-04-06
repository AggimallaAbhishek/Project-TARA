from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "TARA - Threat Analysis & Risk Assessment"
    ollama_model: str = "qwen3-coder:480b-cloud"
    database_url: str = "sqlite:///./tara.db"
    
    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
