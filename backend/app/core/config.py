import os

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Interview Coach"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Security
    SECRET_KEY: str = Field(default="supersecret-interview-coach-jwt-token-key-2026-production-grade", description="JWT secret key")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day for convenient dev/practice
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database (Defaults to SQLite for seamless zero-setup local dev/tests, switchable to PostgreSQL)
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./interview_coach.db",
        description="Async database connection URL"
    )
    SYNC_DATABASE_URL: str | None = Field(
        default="sqlite:///./interview_coach.db",
        description="Sync database URL for Alembic migrations"
    )

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080"
    ]

    # LLM Settings
    LLM_PROVIDER: str = Field(default="mock", description="LLM provider: gemini, openai, or mock")
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    OPENAI_API_KEY: str | None = None
    OPENAI_BASE_URL: str | None = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    SELF_CONSISTENCY_ENABLED: bool = False

    # Whisper Speech-to-Text
    WHISPER_MODEL_SIZE: str = "base"  # tiny, base, small
    WHISPER_DEVICE: str = "cpu"
    WHISPER_COMPUTE_TYPE: str = "int8"
    AUDIO_UPLOAD_DIR: str = "./storage/audio"
    AUDIO_RETENTION_HOURS: int = 0  # 0 means delete immediately after processing
    MAX_AUDIO_FILE_SIZE_MB: int = 25

    # Rate Limits & Usage
    RATE_LIMIT_PER_MINUTE: int = 60

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"
    }


settings = Settings()

# Ensure audio storage folder exists
os.makedirs(settings.AUDIO_UPLOAD_DIR, exist_ok=True)
