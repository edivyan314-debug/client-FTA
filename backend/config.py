from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-2.5-flash"
    embedding_model: str = "models/text-embedding-004"
    demo_mode: bool = True
    cluster_threshold: float = 0.78
    reopen_rejection_pct: float = 0.25
    telegram_bot_token: Optional[str] = None
    upload_dir: str = "./uploads"
    max_audio_mb: int = 10
    citizen_hash_salt: str = "changeme"
    backend_port: int = 8000
    cors_origins: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"


settings = Settings()
