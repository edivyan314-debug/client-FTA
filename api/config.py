from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-2.0-flash"
    embedding_model: str = "models/text-embedding-004"
    demo_mode: bool = True
    demo_seed_on_boot: bool = False
    cluster_threshold: float = 0.78
    reopen_rejection_pct: float = 0.25
    telegram_bot_token: Optional[str] = None
    upload_dir: str = "./uploads"
    max_audio_mb: int = 10
    citizen_hash_salt: str = "changeme"
    backend_port: int = 8000
    # CORS: comma-separated list of allowed origins
    cors_origins: str = "http://localhost:3000"
    allowed_origins: Optional[str] = None  # set via ALLOWED_ORIGINS env var on Render
    # Public base URL for Telegram webhook registration
    public_base_url: Optional[str] = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"

    def get_cors_origins(self) -> list:
        """Return merged list of CORS origins from cors_origins + allowed_origins."""
        origins = set()
        for raw in [self.cors_origins, self.allowed_origins]:
            if raw:
                for o in raw.split(","):
                    o = o.strip()
                    if o:
                        origins.add(o)
        return list(origins) if origins else ["http://localhost:3000"]


settings = Settings()
