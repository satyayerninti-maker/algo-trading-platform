import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Algo Trading Platform"
    DEBUG: bool = bool(os.getenv("DEBUG", False))

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/algo_trading"
    )

    # JWT
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "your-secret-key-change-in-production"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Zerodha
    ZERODHA_API_KEY: str = os.getenv("ZERODHA_API_KEY", "")
    ZERODHA_API_SECRET: str = os.getenv("ZERODHA_API_SECRET", "")
    ZERODHA_REDIRECT_URL: str = os.getenv(
        "ZERODHA_REDIRECT_URL",
        "http://localhost:8000/api/auth/zerodha/callback"
    )

    # Encryption
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "change-me-in-production")

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
