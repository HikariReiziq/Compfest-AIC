"""Configuration settings and environment parameters for COBA API."""

import os
from typing import List, Optional
from pydantic import BaseModel


class Settings(BaseModel):
    """Central configuration for backend service."""
    APP_NAME: str = "COBA - AI Style Recommendation & Try-On Engine"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    MOCK_MODE: bool = os.getenv("MOCK_MODE", "false").lower() in ("true", "1", "yes")

    # Gemini API Configuration
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*",
    ]

    # Data paths
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    CATALOG_PATH: str = os.path.join(BASE_DIR, "ai_engine", "data", "catalog.json")
    PALETTE_RULES_PATH: str = os.path.join(BASE_DIR, "ai_engine", "data", "color_palette_rules.json")


settings = Settings()


def get_settings() -> Settings:
    """Returns application settings instance."""
    return settings
